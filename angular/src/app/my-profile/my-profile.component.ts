import { Component, OnInit, Input } from '@angular/core';
import { UserFirebaseService } from '../user-firebase.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { User } from '../entity/user/user';
import { MobileDetectorService } from '../mobile-detector.service';
import { ToastrService } from 'ngx-toastr';
import { GeoCodingApiService } from '../geo-coding-api.service';
import { RatingService } from '../rating.service';
import { EventFirebaseService } from '../event-firebase.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatDialog } from '@angular/material';
import { ProfileImageDialogComponent } from '../lib/dialogs/profile-image-dialog/profile-image-dialog.component';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css']
})

export class MyProfileComponent implements OnInit {

  user: User = new User({});
  subscription: Subscription;

  isProfileFilled: boolean = false;

  activationError = "Profilen er ikke aktiv. Udfyld alle obligatoriske felter og/eller tryk aktiver i den sidste tab";

  //Progress Bar Material
  color = 'primary';
  mode = 'determinate';
  value = 0;
  showHide = "show";
  //bufferValue= 75;

  public isMobile: boolean = false;

  // Birthday
  today: Date = new Date();
  min = new Date(1930, 0, 1);
  max = new Date((this.today.getFullYear() - 18), 0, 1);
  childMin;
  childMax = new Date();

  // Address
  apiZipValue = "";

  // Activation
  usernameValidation = false;
  userIsDeactivatingAccount = false;
  isActivated = false;

  //Family
  numberOfChildren = 0;
  maxChildren = 3;
  frontEndModellerChildren = [];

  //Settings
  newEvents = false;
  newsDaily = false;
  newsWeekly = false;
  trueText = "Yes";
  falseText = "No";
  selected = "Dagligt";

  // Membership
  userRating = 0;
  eventsHosted = 0;
  eventsAttended = 0;
  metal = "";
  metalName = "Bronze";
  paidUntil;

  user$

  // Button logic
  isUpdating = false;

  constructor(private ufbs: UserFirebaseService, private authService: AuthService,
    private mds: MobileDetectorService, private toast: ToastrService,
    private geoAPI: GeoCodingApiService, private rs: RatingService,
    private efbs: EventFirebaseService, private router: Router,
    private spinner: NgxSpinnerService,
    public dialog: MatDialog,
    ) { }

  state: boolean;
  hasImages: boolean;

  public personDataForm = new FormGroup({
    firstName: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    lastName: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    birthday: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    gender: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    phone: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    street: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    city: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    zip: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    numberOfChildren: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    birthdayChild1: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    birthdayChild2: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    birthdayChild3: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    notifications: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    confirmationText: new FormControl('', { validators: Validators.required, updateOn: 'blur' }),
    username: new FormControl('', { validators: Validators.required, updateOn: 'blur' })
  });

  ngOnInit() {
    this.spinner.show();

    this.isMobile = this.mds.check();

    this.hasImages = false;
    this.getDisplayData();
    this.personDataForm.get('birthday').setValue(new Date(1970, 0, 1));

  }

  getDisplayData() {
    this.user$ = this.ufbs.getUserByID(this.authService.afAuth.auth.currentUser.uid)
    let observer = this.user$.subscribe(value => {
      this.user = new User(value);
      if (this.user.firstName) {
        this.personDataForm.get('firstName').setValue(this.user.firstName);
      }
      if (this.user.lastName) {
        this.personDataForm.get('lastName').setValue(this.user.lastName);
      }
      if (this.user.gender) {
        this.personDataForm.get('gender').setValue(this.user.gender);
      }
      if (this.user.birthday) {
        this.personDataForm.get('birthday').setValue(this.user.birthday);
      }
      if (this.user.phone) {
        this.personDataForm.get('phone').setValue(this.user.phone);
      }
      if (this.user.address) {
        if (this.user.address.city) {
          this.personDataForm.get('city').setValue(this.user.address.city);
        }
        if (this.user.address.zip) {
          this.personDataForm.get('zip').setValue(this.user.address.zip);
        }
        if (this.user.address.street) {
          this.personDataForm.get('street').setValue(this.user.address.street);
        }
      }
      if (this.user.numberOfChildren) {
        this.personDataForm.get('numberOfChildren').setValue(this.user.numberOfChildren);
      }
      if (this.user.username) {
        this.personDataForm.get('username').setValue(this.user.username);
      }

      let childCount = 0;
      if (this.user.children.childOne) {
        this.personDataForm.get('birthdayChild1').setValue(this.user.children.childOne);
        childCount++;
      }
      if (this.user.children.childTwo) {
        this.personDataForm.get('birthdayChild2').setValue(this.user.children.childTwo);
        childCount++;
      }
      if (this.user.children.childThree) {
        this.personDataForm.get('birthdayChild3').setValue(this.user.children.childThree);
        childCount++;
      }

      this.displayBirthdayInput(childCount);

      if (this.user.notifications) {
        this.personDataForm.get('notifications').setValue(this.user.notifications);
        this.selected = this.user.notifications;
      }

      if (this.user.subscribed_until) {
        this.paidUntil = new Date(this.user.subscribed_until);
      } else {
        this.paidUntil = "Ikke betalt";
      }

      let observerTwo = this.rs.getRatings().subscribe(snapshots => {
        let userScore = 0;
        let count = 0;
        snapshots.forEach((snapshot: any) => {
          if (snapshot.payload.val().fk_host === this.authService.afAuth.auth.currentUser.uid) {
            userScore += Number(snapshot.payload.val().score);
            count++;
          }
        });
        this.userRating = userScore / count;
        observerTwo.unsubscribe();
      });

      if (this.user.numberOfEventsAttended) {
        this.eventsAttended = this.user.numberOfEventsAttended;
      }

      let observerThree = this.efbs.getEventsByHost(this.authService.afAuth.auth.currentUser.uid).subscribe(snapshots => {
        this.eventsHosted = snapshots.length;
        if (this.eventsHosted >= 300) {
          this.metal = "/assets/images/shield_platinum.ico";
          this.metalName = "Platin";
        } else if (this.eventsHosted >= 100) {
          this.metal = "/assets/images/shield_gold.ico";
          this.metalName = "Guld";
        } else if (this.eventsHosted >= 30) {
          this.metal = "/assets/images/shield_silver.ico";
          this.metalName = "Sølv";
        } else {
          this.metal = "/assets/images/shield_bronze.ico";
          this.metalName = "Bronze";
        }
        observerThree.unsubscribe();
      });

      this.efbs.getList().subscribe(eventSnapshots => {
        eventSnapshots.forEach((eventSnapshot: any) => {
          if (eventSnapshot.participants !== undefined) {
            Object.values(eventSnapshot.participants).forEach((value: any) => {
              if (value.username === this.user.username) {
                this.eventsAttended++;
              }
            });
          }
        });
      });

      this.accountProgress(this.user);

      //Child birthday min
      this.childMin = this.user.birthday;
      this.spinner.hide();
      observer.unsubscribe();
    });

    //Deactivation
    this.ufbs.getUserByID(this.authService.afAuth.auth.currentUser.uid).subscribe((userSnapshot: any) => {
      this.isActivated = userSnapshot.isActivated;
    });

  }

  updateProfile(formData) {
    this.ufbs.updateUser(formData, this.authService.afAuth.auth.currentUser.uid);
  }

  updateContact(formData) {
    let mergedObj = { phone: formData.phone, address: { street: formData.street, city: formData.city, zip: formData.zip } };
    this.updateProfile(mergedObj);
  }

  updateChildren(formData) {
    let updatesObj = { numberOfChildren: formData.numberOfChildren };
    let appendObj = {};
    if (formData.numberOfChildren > 0) {
      appendObj = {
        children: {
          childOne: formData.birthdayChild1, childTwo: formData.birthdayChild2,
          childThree: formData.birthdayChild3
        }
      };
    } else {
      appendObj = { children: 'ingen' };
    }
    let mergedObj = Object.assign(updatesObj, appendObj);
    this.updateProfile(mergedObj);
  }

  updateSettings(formData) {
    let updatesObj = { notifications: formData.notifications }
    this.updateProfile(updatesObj);
  }

  updatePersonData(formData) {
    this.updateProfile({formData, pictureUrl: this.user.pictureUrl});
  }

  updateUser(formData) {
    let result = "available";
    let updatesObj = { username: formData.username };
    let isSearching = true;
    const observerEight = this.ufbs.getList().subscribe(userSnapshots => {
      userSnapshots.forEach((userSnapshot: any) => {
        if (userSnapshot.payload.val().username === formData.username) {
          result = "unavailable";
        }
      });
      isSearching = false;
      if (!isSearching && result === 'available') {
        this.updateUsernameInParticipantsAndInQueues(formData);
      } else {
        this.toast.toastrConfig.timeOut = 5000;
        this.toast.warning('Dette brugernavn er desværre allerede taget.', 'Hov!');
      }
      observerEight.unsubscribe();
    });
  }

  updateUsernameInParticipantsAndInQueues(formData) {
    const observerNine = this.efbs.getList().subscribe(eventSnapshots => {
      eventSnapshots.forEach((eventSnapshot: any) => {
        const observerTen = this.ufbs.getUserByID(this.authService.afAuth.auth.currentUser.uid).subscribe((userSnapshot: any) => {
          if (eventSnapshot.participants) {
            Object.keys(eventSnapshot.participants).forEach(p => {

              if (eventSnapshot.participants[p].username === userSnapshot.username) {

                this.efbs.leaveEvent(eventSnapshot.key, this.authService.afAuth.auth.currentUser.uid);
                this.efbs.joinEvent(eventSnapshot.key, this.authService.afAuth.auth.currentUser.uid, formData.username);
              }
            });
          }
          if (eventSnapshot.inQueue) {
            Object.keys(eventSnapshot.inQueue).forEach(qP => {

              if (eventSnapshot.inQueue[qP].username === userSnapshot.username) {

                this.efbs.leaveQueue(eventSnapshot.key, this.authService.afAuth.auth.currentUser.uid);
                this.efbs.joinQueue(eventSnapshot.key, this.authService.afAuth.auth.currentUser.uid, formData.username);
              }
            });
          }
          this.ufbs.updateUser({ username: formData.username }, this.authService.afAuth.auth.currentUser.uid);
          observerTen.unsubscribe();
        });
      });
      observerNine.unsubscribe();
    });
  }

  accountProgress(userObj) {
    let point = 100 / 8;
    let filled = 0;
    let missingProperties = this.fieldsMissing();
    filled = point * (8 - missingProperties.length);
    this.isProfileFilled = (filled >= 100);
    // if (filled < 100) {

    // }
    this.value = filled;
    if (this.value >= 100) {
      this.showHide = "hide";
    } else {
      this.showHide = "show";
    }
    return filled;




  }

  activateAccount() {
    this.userIsDeactivatingAccount = false;
    true || this.accountProgress(this.user) >= 100 ?
      this.ufbs.updateUser({ isActivated: true }, this.authService.afAuth.auth.currentUser.uid) :
      this.ufbs.updateUser({ isActivated: false }, this.authService.afAuth.auth.currentUser.uid);
  }

  deactivateAccount() {
    this.userIsDeactivatingAccount = true;
    this.ufbs.updateUser({ isActivated: false }, this.authService.afAuth.auth.currentUser.uid);
  }

  deleteAccount() {
    window.confirm('Er du sikker? (Sidste advarsel)');
    this.authService.isDeletingUser = true;
    this.ufbs.deleteUser(this.authService.afAuth.auth.currentUser.uid).then(() => {
      this.authService.afAuth.auth.currentUser.delete().then(() => {
        this.authService.doSignout();
      });
    });
  }

  displayBirthdayInput(eventTargetValue) {
    this.maxChildren = eventTargetValue;
    if (this.maxChildren > 3) {
      this.maxChildren = 3;
    }
    if (eventTargetValue > 0) {
      this.numberOfChildren = eventTargetValue;
      this.frontEndModellerChildren = [];
      for (let i = 0; i < this.maxChildren; i++) {
        this.frontEndModellerChildren.push({ id: "kidBirthday" + (1 + i), formControlName: "birthdayChild" + (1 + i), matDatePicker: "pickerChild" + (1 + i), view: "Fødselsdag for barn" });
      }
      if (eventTargetValue > 3) {
        this.toast.toastrConfig.positionClass = 'toast-bottom-center';
        this.toast.info('Eftersom at du har mere end 3 børn, angiv kun fødselsdagen for de 3 yngste', 'Info')
        this.toast.toastrConfig.positionClass = 'toast-top-right';
      }
    } else {
      this.frontEndModellerChildren = [];
    }

  }

  changedNewsEvent() {
    this.newEvents = !this.newEvents;
  }

  changedNewsDaily() {
    this.newsDaily = !this.newsDaily;
  }

  changedNewsWeekly() {
    this.newsWeekly = !this.newsWeekly;
  }

  usernameInput(input) {
    if (input === this.user.username) {
      this.usernameValidation = true;
    }
  }

  lookUpCity(eventTargetValue) {
    if ((eventTargetValue as string).length > 3) {
      this.geoAPI.getZipFromCity(eventTargetValue).map(response => response.json()).subscribe(result => this.personDataForm.get('city').setValue(result.navn));
    }
  }

  onUpdateClick() {
    this.isUpdating = true;
    this.toast.toastrConfig.timeOut = 2000;
    this.toast.info('Din profil opdaterer', 'Info').onHidden.subscribe(() => {
      this.isUpdating = false;
    });
  }

  openUrlDialog() {
      const dialogRef = this.dialog.open(ProfileImageDialogComponent, {
        width: '600px',
        data: {pictureUrl: this.user.pictureUrl}
      });
  
      dialogRef.afterClosed().subscribe((result) => {
        if (result !== undefined)  {
          this.user.pictureUrl = result;
        }
      });
  }

  fieldsMissing() {
    this.toast.toastrConfig.timeOut = 10000;
    let missingProperties = [];
    if (!this.user.address) {
      missingProperties.push("Adresse");
    }
    if (this.user.birthday === undefined) {
      missingProperties.push('Fødselsdag');
    }
    if (this.user.numberOfChildren === undefined) {
      missingProperties.push('Antal børn');
    }
    if (!this.user.firstName) {
      missingProperties.push('Fornavn');
    }
    if (this.user.lastName === undefined) {
      missingProperties.push('Efternavn');
    }
    if (this.user.notifications === undefined) {
      missingProperties.push('Indstillinger/notifikationer');
    }
    if (this.user.phone === undefined) {
      missingProperties.push('Telefon/mobil');
    }
    if (this.user.gender === undefined) {
      missingProperties.push('Køn');
    }

    let content = "";
    missingProperties.forEach(prop => {
      content += prop + "\n";
    });

    if (missingProperties.length < 1) {
      this.toast.info('Du har udfyldt alle felter', 'Info');
    } else {
      this.toast.info(`Du mangler: \n ${content}`, 'Info');
    }

    return missingProperties
  }
}
