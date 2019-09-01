import { Component, OnInit, ViewChild } from '@angular/core';
import { MatInput, MatDialogRef, MatDialog } from '@angular/material';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GeoCodingApiService } from 'src/app/geo-coding-api.service';
import { EventFirebaseService } from 'src/app/event-firebase.service';
import { WallService } from 'src/app/wall.service';
import { UserFirebaseService } from 'src/app/user-firebase.service';
import { AuthService } from 'src/app/auth.service';
import { Event } from 'src/app/entity/event/event.model';
import { EventAddress } from 'src/app/entity/helper/EventAddress';
import { CreateNewEventComponent } from 'src/app/create-new-event/create-new-event.component';
import { GeoCoord } from 'ng2-haversine';
import { TranslateService } from '@ngx-translate/core';

export const errorMessages: { [key: string]: string } = {
  eventName: 'Titel må ikke være mere end 50 tegn',
  required: 'Dette felt er obligatorisk',
};

export function nameValueDictionaryFromObject(values: any): any {
  return Object.keys(values).map(function(key) {
    return Object.create({
      value: key.toLowerCase(),
      name: values[key]
    })
  });
}

@Component({
  selector: 'app-new-event',
  templateUrl: './new-event.component.html',
  styleUrls: ['./new-event.component.css']
})
export class NewEventComponent implements OnInit {

  newEventFormGroup: FormGroup;
  apiZipValue;
  event: Event;
  geoCoord: GeoCoord;
  errors = errorMessages;
  userInsertedAddress: any;
  homeAddressSelected: boolean;
  categories: any;
  errorMessages
  user$: any;

  constructor(
    private _formBuilder: FormBuilder,
    private geoAPI: GeoCodingApiService,
    private eventService: EventFirebaseService,
    private wallService: WallService,
    private userService: UserFirebaseService,
    private authService: AuthService,
    public dialogRef: MatDialogRef<NewEventComponent>,
    public dialog: MatDialog,
    private translateService: TranslateService
  ) {
    this.user$ = this.userService.getUserByID(this.authService.afAuth.auth.currentUser.uid);

    this.translateService.get("COMPONENTS.NEW_EVENT.WHAT_AND_WHERE_STEP.CATEGORIES").subscribe(values => {
      this.categories = nameValueDictionaryFromObject(values);
    });

    this.errorMessages = this.translateService.instant("COMPONENTS.FORM_VALIDATION.ERROR_MESSAGES");
    this.apiZipValue = this.translateService.instant("COMPONENTS.NEW_EVENT.WHAT_AND_WHERE_STEP.CITY_LABEL");
  }

  // @ViewChild('title') nameInput: MatInput;

  ngOnInit() {

    this.newEventFormGroup = this._formBuilder.group({
      eventName: ['', [Validators.required, Validators.maxLength(50)]],
      eventDescription: ['', Validators.required],
      eventLocationStreet: ['', Validators.required],
      eventLocationCity: [''],
      eventLocationZip: ['', Validators.required],
      eventCategory: ['', Validators.required]
    });
    //  this.nameInput.focus();
  }

  get eventName() {
    return this.newEventFormGroup.get('eventName');
  }

  onSubmitEvent() {

    if (this.newEventFormGroup.valid) {

      this.user$.subscribe((userSnapshot: any) => {
        console.log({userSnapshot})
        const e = this.formDataToModel(userSnapshot);
        console.log({e})
        this.eventService.insertEvent(e).then((thenableRef) => {
          let key = thenableRef.path.pieces_[1];
          this.wallService.insertWall({ fk_event: key, posts: {} });
        });
        // this.userService.updateUser({numberOfEventsHosted: userSnapshot.numberOfEventsHosted + 1}, this.authService.afAuth.auth.currentUser.uid).then( () => {
        //   observer.unsubscribe();
        //   });
      });
    } else {

      // validate all form fields
    }

    // let observer = this.ufbs.getUserByID(this.authService.afAuth.auth.currentUser.uid).subscribe( (userSnapshot:any) => {
    //   let e: Event = this.formDataToModel(userSnapshot);
    //   this.efbs.insertEvent(e).then( (thenableRef) => {
    //     let key = thenableRef.path.pieces_[1];
    //     this.ws.insertWall( {fk_event: key, posts: {} } );
    //   });
    //   this.ufbs.updateUser({numberOfEventsHosted: userSnapshot.numberOfEventsHosted + 1}, this.authService.afAuth.auth.currentUser.uid).then( () => {
    //     observer.unsubscribe();
    //     });
    //   });
  }

  formDataToModel(userSnapshot?): Event {

    const event = new Event({});

    event.name = this.newEventFormGroup.value.eventName;
    event.address = new EventAddress(this.newEventFormGroup.value.eventLocationStreet,
      this.apiZipValue, this.newEventFormGroup.value.eventLocationZip);
    event.category = this.newEventFormGroup.value.eventCategory;
    event.description = this.newEventFormGroup.value.eventDescription;

    event.geoCoord = this.geoCoord;

    if (userSnapshot) event.participants = [{ username: userSnapshot.username }];

    event.host = this.authService.afAuth.auth.currentUser.uid;

    if (event.hostRating === undefined) {
      event.hostRating = 0;
    }

    // if (false /*!this.isTransferingMoney*/) {
    //   event.paymentDue = "Kontant ved ankomst på dagen";
    // }
    this.onNoClick();
    return event;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }


  lookUpZipFromInput(event) {
    this.lookUpZip(event.target.value);
  }
  
  lookUpZip(zip) {
    if ((zip as string).length > 3) {
      this.geoAPI.getZipFromCity(zip).map(response => response.json()).subscribe(result => {
      this.geoCoord = {
          latitude: result.visueltcenter[1],
          longitude: result.visueltcenter[0]
        };
        this.apiZipValue = result.navn;
      });
    }
  }

  fillDetails(): void {
    this.dialogRef.close();
    this.dialog.open(CreateNewEventComponent, {
      width: screen.width / 1.25 + "px",
      height: screen.height / 1.75 + "px",
      data: this.formDataToModel()
      // disableClose: true
    });
  }

  insertHomeAddress(event, user) {

    if (event.checked) {
      this.userInsertedAddress = {
        street: this.newEventFormGroup.get('eventLocationStreet').value,
        zip: this.newEventFormGroup.get('eventLocationZip').value,
        city: this.apiZipValue
      }
      this.newEventFormGroup.patchValue({
        eventLocationStreet: user.address.street,
        eventLocationZip: user.address.zip,
      });
      this.lookUpZip(user.address.zip);
    } else {
      this.newEventFormGroup.patchValue({
        eventLocationStreet: this.userInsertedAddress.street,
        eventLocationZip: this.userInsertedAddress.zip,
      });
      this.apiZipValue = this.userInsertedAddress.city;
    }
  }

}