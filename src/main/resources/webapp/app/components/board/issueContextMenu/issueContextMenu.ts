import {Component, EventEmitter} from "@angular/core";
import {ControlGroup, FormBuilder, Validators} from "@angular/common";
import {BoardData} from "../../../data/board/boardData";
import {IssueData} from "../../../data/board/issueData";
import {IssuesService} from "../../../services/issuesService";
import {IssueComponent} from "../issue/issue";
import {ProgressErrorService} from "../../../services/progressErrorService";
import {State} from "../../../data/board/header";
import {Hideable} from "../../../common/hide";

@Component({
    inputs: ['data'],
    outputs: ['closeContextMenu'],
    selector: 'issue-context-menu',
    templateUrl: 'app/components/board/issueContextMenu/issueContextMenu.html',
    styleUrls: ['app/components/board/issueContextMenu/issueContextMenu.css'],
    directives: [IssueComponent]
})
export class IssueContextMenuComponent implements Hideable {
    private _data:IssueContextMenuData;
    private showContext:boolean = false;
    private issue:IssueData;
    private endIssue:boolean;
    private toState:string;
    private issuesForState:IssueData[];
    private canRank:boolean;

    //Calculated dimensions
    private movePanelTop:number;
    private movePanelHeight:number;
    private movePanelLeft:number;
    private movePanelWidth:number;
    private statesColumnHeight:number;

    private insertBeforeIssueKey:string;

    private move:boolean;

    private comment:boolean;
    private commentForm:ControlGroup;
    private commentPanelLeft:number;
    
    private closeContextMenu:EventEmitter<any> = new EventEmitter();

    constructor(private _boardData:BoardData, private _issuesService:IssuesService,
                private _progressError:ProgressErrorService, private _formBuilder:FormBuilder) {
        _boardData.registerHideable(this);
    }

    private set data(data:IssueContextMenuData) {
        this.showContext = !!data;
        this.move = false;
        this.toState = null;
        this.issue = null;
        this.endIssue = false;
        this.issuesForState = null;
        this.insertBeforeIssueKey = null;
        this._data = data;
        this.issue = null;
        if (data) {
            this.issue = this._boardData.getIssue(data.issueKey);
            this.toState = this.issue.boardStatus;
            this.issuesForState = this._boardData.getValidMoveBeforeIssues(this.issue.key, this.toState);
            this.canRank = this._boardData.canRank(this.issue.projectCode);
        }
        this.setWindowSize();
    }


    hide():void {
        this.hideAllMenus();
    }

    private hideAllMenus() {
        this.showContext = false;
        this.move = false;

        this.comment = false;
        this.commentForm = null;
    }

    private get data() {
        return this._data;
    }

    private get displayContextMenu() : boolean {
        return !!this._data && !!this.issue && this.showContext;
    }

    private get moveStates() : string[] {
        return this._boardData.boardStateNames;
    }

    private isValidMoveState(state:string) : boolean {
        //We can do a plain move to all states apart from ourselves
        return this._boardData.isValidStateForProject(this.issue.projectCode, state) && state != this.issue.boardStatus;
    }

    private isValidRankState(stateName:string) : boolean {
        if (!this._boardData.isValidStateForProject(this.issue.projectCode, stateName)) {
            return false;
        }
        let state:State = this._boardData.indexedBoardStates.forKey(stateName);
        if (state.done) {
            return false;
        }
        if (state.backlog && !this._boardData.showBacklog) {
            return false;
        }
        if (state.unordered) {
            return false;
        }
        return true;
    }

    private onShowMovePanel(event:MouseEvent) {
        event.preventDefault();
        this.hideAllMenus();
        this.move = true;
    }

    private onSelectMoveState(event:MouseEvent, toState:string) {
        //The user has selected to move to a state accepting the default ranking
        event.preventDefault();
        this.issuesForState = null;
        this.toState = toState;

        this.moveIssue(false, null);
    }

    private onSelectRankState(event:MouseEvent, toState:string) {
        //The user has selected the rank for state button, pull up the list of issues
        event.preventDefault();
        this.issuesForState = this._boardData.getValidMoveBeforeIssues(this.issue.key, toState);
        this.toState = toState;
    }

    private onSelectRankIssue(event:MouseEvent, beforeIssueKey:string) {
        console.log("onSelectMoveIssue - " + beforeIssueKey)
        event.preventDefault();
        this.insertBeforeIssueKey = beforeIssueKey;

        if (this.issue.key == beforeIssueKey) {
            //If we are moving to ourself just abort
            console.log("onSelectMoveIssue - key is self, returning")
            this.hideAllMenus();
            return;
        }
        this.moveIssue(true, beforeIssueKey);
    }

    private moveIssue(rank:boolean, beforeIssueKey:string) {
        let beforeKey:string;;
        let afterKey:string;

        if (rank) {
            beforeKey = beforeIssueKey === "" ? null : beforeIssueKey;
            if (!beforeKey && this.issuesForState.length > 0) {
                afterKey = this.issuesForState[this.issuesForState.length - 1].key;
            }
            console.log("onSelectMoveIssue key - afterKey " + afterKey);
        }
        //Tell the server to move the issue. The actual move will come in via the board's polling mechanism.
        this._progressError.startProgress(true);
        this._issuesService.moveIssue(this._boardData, this.issue, this.toState, beforeKey, afterKey)
            .subscribe(
                data => {},
                error => {
                    this._progressError.setError(error);
                    this.hideAllMenus();
                },
                () => {
                    this._progressError.finishProgress();
                    this.hideAllMenus();
                }
            );
    }


    private onShowCommentPanel(event:MouseEvent) {
        event.preventDefault();
        this.hideAllMenus();
        this.comment = true;
        this.commentForm = this._formBuilder.group({
            "comment": ["", Validators.required]
        });
    }

    private saveComment() {
        let comment:string = this.commentForm.value.comment;
        this._progressError.startProgress(true);
        this._issuesService.commentOnIssue(this._boardData, this.issue, comment)
            .subscribe(
                data => {
                    this.hideAllMenus();
                },
                err => {
                    this._progressError.setError(err);
                },
                () => {
                    this._progressError.finishProgress(
                        "Comment made on issue <a " +
                        "class='toolbar-message' href='" + this._boardData.jiraUrl + "/browse/" + this.issue.key + "'>" +
                        this.issue.key + "</a>");
                }
            );

    }

    private onResize(event : any) {
        this.setWindowSize();
    }

    private setWindowSize() {
        let movePanelTop:number, movePanelHeight:number, movePanelLeft:number, statesColumnHeight:number;
        let movePanelWidth:number = this.canRank ? 720 : 405;

        //40px top and bottom padding if window is high enough, 5px otherwise
        let yPad = window.innerHeight > 350 ? 40 : 5;
        movePanelHeight = window.innerHeight - 2 * yPad;
        movePanelTop = window.innerHeight/2 - movePanelHeight/2;

        statesColumnHeight = movePanelHeight - 55;

        //css hardcodes the width as 720px;
        if (window.innerWidth > movePanelWidth) {
            movePanelLeft = window.innerWidth/2 - movePanelWidth/2;
        }
        this.movePanelTop = movePanelTop;
        this.movePanelHeight = movePanelHeight;
        this.movePanelLeft = movePanelLeft;
        this.movePanelWidth = movePanelWidth;
        this.statesColumnHeight = statesColumnHeight;

        this.commentPanelLeft = (window.innerWidth - 600)/2;
    }

    private isIssueSelected(issue:IssueData) : boolean {
        if (this.insertBeforeIssueKey) {
            return issue.key === this.insertBeforeIssueKey;
        }
        return this.issue.key == issue.key;
    }


    private onClickClose(event:MouseEvent) {
        this.hideAllMenus();
        this.closeContextMenu.emit({});
        event.preventDefault();
    }

    get boardData():BoardData {
        return this._boardData;
    }
}

export class IssueContextMenuData {
    constructor(private _issueKey:string,
                private _x:number,
                private _y:number) {
    }

    get issueKey():string {
        return this._issueKey;
    }

    get x():number {
        return this._x;
    }

    get y():number {
        return this._y;
    }
}

