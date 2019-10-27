import { Component, OnInit, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../auth.service';
import { UserFirebaseService } from '../user-firebase.service';
import { User } from '../entity/user/user';
import { EventListComponent } from './event-list/event-list.component';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class EventsComponent implements OnInit {

  @ViewChild(EventListComponent, {static: false}) eventsList: EventListComponent;

  messages = [
    {msg: "Her kan du finde alle events som brugerne er arrangøre af netop nu!", title: "Tip"},
    {msg: "Du kan filtrere ved brug af vinduet: filter til venstre eller ved brug af søgefeltet", title: "Tip"},
    {msg: "Brug knapperne til at gå til dine egne events, oprette et nyt eller fjerne filtre", title: "Tip"}
  ]

  public isMobile: boolean = false;

  constructor(
    private authService: AuthService, 
    private ufbs: UserFirebaseService,
    private toast: ToastrService
  ) { }

  ngOnInit() {
    if (window.screen.width <= 600) {
      this.isMobile = true;
    } 
  }

  showAllEvents(isJoinedShown: boolean) {
    this.eventsList.showAllEvents(isJoinedShown);
  }

  showMyEvents(showMyEvents: boolean) {
    this.eventsList.showOnlyMyEvents(showMyEvents);
  }

  showPastEvents(isPastShown: boolean) {
    this.eventsList.showPastEvents(isPastShown);
  }

  showJoinedEvents(isJoinedShown: boolean) {
    this.eventsList.showJoinedEvents(isJoinedShown);
  }



}
