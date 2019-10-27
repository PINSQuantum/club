import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { EventFirebaseService } from '../../event-firebase.service';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { DataSource } from '@angular/cdk/table';
import { MobileDetectorService } from '../../mobile-detector.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { TableFilterService } from '../../table-filter.service';
import { Event } from '../../entity/event/event.model';
import { Router, NavigationExtras } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { HaversineService, GeoCoord } from "ng2-haversine";
import { UserFirebaseService } from '../../user-firebase.service';
import { AuthService } from '../../auth.service';
import { User } from '../../entity/user/user';
import { GeoCodingApiService } from '../../geo-coding-api.service';
import { userInfo } from 'os';
import { RatingService } from 'src/app/rating.service';
import { first } from 'rxjs/operators';

export interface EventData {
  name: string;
  address: string;
  distance: string;
  genderRatio: string;
  targetGroup: string;
  available: number;
  category: string;
  dateStart: string;
}

export interface EventDataMobile {
  name: string;
  address: string;
  available: number;
}

@Component({
  selector: 'event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit {

  isMobile = false;

  dataSource = new MatTableDataSource<EventData>();
  displayedColumns = ['name', 'address', 'category', 'distance', 'available', 'dateStart', 'creationDate', 'rate'];
  dataSourceMobile = new MatTableDataSource<EventDataMobile>();
  displayedColumnsMobile = ['name', 'address', 'available', 'dateStart'];

  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: false}) sort: MatSort;

  events: Event[] = [];
  currentEvents = [];
  ratings;
  username;

  subscription: Subscription;
  filterValue: any;

  constructor(
    private ufbs: UserFirebaseService,
    private authService: AuthService,
    private efbs: EventFirebaseService,
    private mds: MobileDetectorService, private spinner: NgxSpinnerService,
    private tfs: TableFilterService, private router: Router,
    private toast: ToastrService,
    private geoAPI: GeoCodingApiService,
    private haversineService: HaversineService,
    private rs: RatingService, 
  ) {

    this.rs.getRatings().subscribe(ratings => {
      this.ratings = ratings;
    });

    this.ufbs.getUserByID(this.authService.afAuth.auth.currentUser.uid).pipe(first()).subscribe( (userSnapshot:any) => {
      if(userSnapshot) {
        this.username = userSnapshot.username;
      } else {
        this.authService.doSignout();
      }
    });

    this.efbs.getList().subscribe((eventSnapshots: any) => {
      this.events = eventSnapshots;
      Object.keys(this.events).forEach((index: any) => {
        // this.events[event] = { ...this.events[index], participantCount: Object.keys(this.events[index].participants).length };
      });

      // this.events.forEach(event => {
      //   event.dateStart = new Date(event.dateStart).getTime() || 1567987200000;
      //   event.deadlineDate = new Date(event.deadlineDate).getTime() || 1567987200000;
      //   event.creationDate = new Date(event.creationDate).getTime() || 1567987200000;
      // })

     

      this.ufbs.getUserByID(this.authService.afAuth.auth.currentUser.uid).subscribe(userSnapshot => {
        let user = new User(userSnapshot);
        
        if (user.address) {

          user.address.zip;

          this.geoAPI.getZipFromCity(user.address.zip.toString()).map(response => response.json()).subscribe(result => {

            this.events.map((event: Event) => {
              let userGeo: GeoCoord = {
                latitude: result.visueltcenter[1],
                longitude: result.visueltcenter[0]
              };

            if (event.geoCoord) {
                let meters = this.haversineService.getDistanceInMeters(event.geoCoord, userGeo);
                event.distance = (meters / 1000).toFixed(1);
              }
            });
          

          });
        }
        this.currentEvents = this.events.filter( event => event.dateStart > Date.now());
        this.updateEventList(this.currentEvents);

      });


    }, (error) => {
    });

    this.subscription = this.tfs.getEvent().subscribe(filter => { this.applyFilter(filter) });

  }

  rate(e: Event ) {
    let navigationExtras: NavigationExtras = {
      queryParams: {
        "key": e.key
      }
    }
    this.router.navigate(['/rate-event'], navigationExtras);
  }

  updateEventList(events) {

    if (this.events.length > 0) {
      this.paginator.firstPage();

      this.dataSource = new MatTableDataSource(events);
      this.dataSource.filterPredicate = this.customFilterPredicate();
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;

      this.dataSourceMobile = new MatTableDataSource(events);
      this.dataSourceMobile.filterPredicate = this.customFilterPredicate();
      this.dataSourceMobile.paginator = this.paginator;
      this.dataSourceMobile.sort = this.sort;
      this.spinner.hide();
      // observer.unsubscribe();
    }
  }

  
  showAllEvents(showMyEvents: boolean) {
    this.updateEventList(this.currentEvents);
  }

  showOnlyMyEvents(showMyEvents: boolean) {
    let myEvents;
    const userId = this.authService.afAuth.auth.currentUser.uid;
    if (showMyEvents) {
      myEvents = this.currentEvents.filter((event: Event) => 
        event.host == userId || event.participants[userId] !== undefined
      );
    } else {
      myEvents = this.currentEvents;
    }
    this.updateEventList(myEvents);

  }

  showPastEvents(isPastShown: boolean) {
    let myEvents;
    const userId = this.authService.afAuth.auth.currentUser.uid;
    if (isPastShown) {
      myEvents = this.events.filter( event => {
        return event.dateStart <= Date.now()
        && (event.host == userId || event.participants[userId] !== undefined)
      });
    } else {
      myEvents = this.currentEvents;
    }
    this.updateEventList(myEvents);

  }

  wasParticipant(event: Event) {
    let hasAlreadyRated = this.ratings.find(rating => rating.key == this.username + event.key);
    const userId = this.authService.afAuth.auth.currentUser.uid;
    return event.dateStart <= Date.now() && event.participants[userId] !== undefined && !hasAlreadyRated && event.host != userId;
  }

  showJoinedEvents(isJoinedShown: boolean) {
    let myEvents;
    if (isJoinedShown) {
      myEvents = this.events.filter( event => {
        if ( event.dateStart > Date.now() && event.participants) {
          return event.participants[this.authService.afAuth.auth.currentUser.uid] !== undefined;
        } else {
          return false;
        }
      });
    } else {
      myEvents = this.currentEvents;
    }
    this.updateEventList(myEvents);
  }

  ngOnInit() {
    this.spinner.show();
    this.isMobile = this.mds.check();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.events.length < 1) {
        this.spinner.hide();
        this.toast.info("Der er ingen events oprettet", "Info");
      }
    }, 3000);
  }

  applyFilter(filterValue) {
    
    this.dataSource.filter = JSON.stringify(filterValue);

    // let obj = {category: strArr[1], genderRatio: strArr[2], targetGroup: strArr[3]};
    
    // this.dataSource.filter = JSON.stringify(obj);

    // let isAccepted = true;
    // if (strArr[0] !== "") {
    //   if ( Number(strArr[0]) < this.dataSource.) {
    //     isAccepted = false;
    //   }
    // }
    // if (strArr[1] !== "") {
    //   if ( strArr[1] !== dataSource.targetGroup) {
    //     isAccepted = false;
    //   }
    // }
    // if (strArr[2] !== "") {
    //   if ( strArr[2] !== dataSource.category) {
    //     isAccepted = false;
    //   }
    // }
    // if (strArr[3] !== "") {
    //   if ( strArr[3] !== dataSource.genderRatio) {
    //     isAccepted = false;
    //   }
    // }

    // this.dataSource.filter = filterValue.trim().toLowerCase();
    // this.dataSourceMobile.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
      this.dataSourceMobile.paginator.firstPage();
    }
  }

  onViewClick(element) {
    let e: Event = element;
    let navigationExtras: NavigationExtras = {
      queryParams: {
        "key": e.key
      }
    }
    this.router.navigate(['/view-event'], navigationExtras);
  }

  customFilterPredicate() {
    return function (data: EventData, filter: string): boolean {
    let searchString = JSON.parse(filter);
    let isAccepted: boolean = true;

      
      

      if (searchString.targetGroup !== undefined) {
        if (data.targetGroup.trim().indexOf(searchString.targetGroup) === -1) {
          isAccepted = false;
        }
      }

      if (searchString.genderRatio !== undefined) {
        if (data.genderRatio.trim().indexOf(searchString.genderRatio) === -1) {
          isAccepted = false;
        }
      }

      if (searchString.category !== undefined) {
        if (data.category.trim().indexOf(searchString.category) === -1) {
          isAccepted = false;
        }
      }
      let tempDist;
      let filtDist = parseFloat(searchString.distance);

      if (data.distance === undefined) {
        tempDist = 100;
      } else {
        tempDist = parseFloat(data.distance);
      }


      if (filtDist !== undefined) {
        if (tempDist > filtDist) {
          isAccepted = false;
        }
      }

      

      return isAccepted;
    }
  }
}

export class EventDataSource extends DataSource<any> {
  paginator: MatPaginator;
  sort: MatSort;
  filter: string;
  constructor(private efbs: EventFirebaseService) {
    super();
  }
  connect(): Observable<any[]> {
    return this.efbs.getList();
  }
  disconnect() { }
}

