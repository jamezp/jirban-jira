//our root app component
import {Component, View, provide} from 'angular2/core'
import {HTTP_PROVIDERS} from 'angular2/http';
import {APP_BASE_HREF, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, HashLocationStrategy, Location, LocationStrategy, Route, RouteConfig, Router, RouterLink, RouterOutlet} from 'angular2/router';
import {AboutComponent} from './components/about/about';
import {BoardComponent} from './components/board/board';
import {BoardsComponent} from './components/boards/boards';
import {ConfigComponent} from "./components/config/config";
import {version} from "angular2/src/upgrade/angular_js";

@Component({
    selector: 'my-app'
})
@RouteConfig([
    new Route({path: '/', component: AboutComponent, name: 'About'}),
    new Route({path: '/board', component: BoardComponent, name: 'Board'}),
    new Route({path: '/boards', component: BoardsComponent, name: 'Boards'}),
    new Route({path: '/config', component: ConfigComponent, name: 'Config'})
])
@View({
    template: `

<div class="toolbar">
    <div class="toolbar-left">
        <span><a [routerLink]="['/About']" class="toolbar-link"><b>JirBan</b></a></span>
        <span> <a [routerLink]="['/Boards']" class="toolbar-link">Boards</a></span>
        <!-- TODO Only display this if it is an admin -->
        <span> <a [routerLink]="['/Config']" class="toolbar-link">Config</a></span>
    </div>
</div>

<router-outlet></router-outlet>
    `,
    directives: [ROUTER_DIRECTIVES, AboutComponent, BoardComponent]
})
export class App {
    router:Router;
    location:Location;

    constructor(router:Router, location:Location) {
        this.router = router;
        this.location = location;

        //console.log("VERSION " + JSON.stringify(version));
    }
}
