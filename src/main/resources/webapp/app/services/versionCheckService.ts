import {Http, Response} from "@angular/http";
import {Observable} from "rxjs/Observable";
import {RestUrlUtil} from "../common/RestUrlUtil";
import {Injectable} from "@angular/core";

@Injectable()
export class VersionCheckService {

    private timeout:number = 20000;

    constructor(private _http:Http) {
    }

    getVersion() : Observable<any> {
        let path:string = RestUrlUtil.caclulateRestUrl('rest/jirban/1.0/version');
        let ret:Observable<any> =
            this._http.get(path)
                .timeout(this.timeout, "The server did not respond in a timely manner for GET " + path)
                .map((res: Response) => res.json());

        return ret;
    }
}