import { Injectable } from '@angular/core';

import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase/app';

// Routing
import { Router} from '@angular/router';

// Session storage
import { SessionStorage, SessionStorageService } from 'angular-web-storage'

import { UserFirebaseService } from './user-firebase.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { User } from './entity/user/user';
import { ToastrService } from 'ngx-toastr';
import { TranslateHelperService } from './services/translate.service';
import { first } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  user: firebase.User;
  isDeletingUser = false;
  //public userInfo: Observable<firebase.User>;

  constructor(
    public afAuth: AngularFireAuth, 
    private router: Router, 
    private session: SessionStorageService, 
    private ufbs: UserFirebaseService, 
    private spinner: NgxSpinnerService, 
    private toast: ToastrService,
    private translate: TranslateHelperService,
    ) {
      // To apply the default browser preference instead of explicitly setting it.
      // firebase.auth().useDeviceLanguage();
      
      //this.userInfo = this.afAuth.authState;
   }

  doRegister(formData){
    return new Promise<any>((resolve, reject) => {
      firebase.auth().createUserWithEmailAndPassword(formData.email, formData.password)
      .then(res => {
        resolve(res);
        // Don't include the password in the database -> user table
        delete formData['password'];
        let user = new User(formData);
        const date = new Date();
        date.setUTCFullYear(2019, 0, 1);
        user.subscribed_until = date;
        this.ufbs.insertUser(user, res.user.uid);
        this.doLogin({email: formData.email, password: formData.password});
      }, err => reject(err))
    })
  }

  doLogin(formData) {
    return this.afAuth.auth
      .signInWithEmailAndPassword(formData.email, formData.password)
      .then(res => {
        const user = res.user
        if (user !== null) {
            this.user = user;
            if (user.emailVerified) {
                this.router.navigate(['/events']);
            } else {
                this.router.navigate(['/verify-email']);
            }
        }
      
      this.user = this.afAuth.auth.currentUser;
        //this.loginRedirect();
        return user;
      })
      .catch(error => {
        this.translate.translateFirebaseErrorMessage(error.code).subscribe(message => this.toast.error(message));
        console.log(error);
      });
  }


  // doSocialLoginRegister(firebaseUser: firebase.User) {
  //   
    // const userEntity: User = new User({"username": firebaseUser.displayName, "email": firebaseUser.email});
    // const date = new Date();
    // date.setUTCFullYear(2019, 0, 1);
    // userEntity.subscribed_until = date;
    // this.ufbs.insertUser(userEntity, firebaseUser.uid);
  // }

  doGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    this.afAuth.auth.useDeviceLanguage();
    return this.afAuth.auth.signInWithPopup(provider).then( result => {
      this.ufbs.getUserByID(result.user.uid).pipe(first()).subscribe(user => {
        if(!user) {
          const date = new Date();
          date.setUTCFullYear(2020, 3, 1);
          const userEntity: User = new User({
            username:         result.user.displayName, 
            email:            result.user.email,
            subscribed_until: date,
            firstName:        result.additionalUserInfo.profile["given_name"],
            lastName:         result.additionalUserInfo.profile["family_name"],
            pictureUrl:       result.additionalUserInfo.profile["picture"]
          });
          
          this.ufbs.insertUser(userEntity, result.user.uid).then(() => {
            this.router.navigate(['/my-profile']);
          });
        }
      });
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
      // ...
    });
  }

  doFacebookLogin() {
    const provider = new firebase.auth.FacebookAuthProvider();
    this.afAuth.auth.useDeviceLanguage();
    return firebase.auth().signInWithPopup(provider).then(function(result) {
      return result;
      // // This gives you a Facebook Access Token. You can use it to access the Facebook API.
      // var token = result.credential.accessToken;
      // // The signed-in user info.
      // var user = result.user;
      // // ...
    }).catch(function(error) {
      
      return error;
      // // Handle Errors here.
      // var errorCode = error.code;
      // var errorMessage = error.message;
      // // The email of the user's account used.
      // var email = error.email;
      // // The firebase.auth.AuthCredential type that was used.
      // var credential = error.credential;
      // // ...
    });
  }

  doSignout() {
    return this.afAuth.auth.signOut().then(() => {
      this.user = null;
      this.signoutRedirect();
      this.session.remove("user");
      this.router.navigated[('/landing-page')];
    });
  }

  loginRedirect() {
    this.router.navigate(['/loggedin-dashboard']);
  }

  signoutRedirect() {
    this.router.navigate(['/']);
  }

  authenticated(): boolean {
    return this.afAuth.auth.currentUser !== null;
  }

  currentUserObservable(): any {
    return this.afAuth.authState;
  }

  makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < 28; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
  }

  sendVerificationMail() {
    
    firebase.auth().currentUser.sendEmailVerification().then( () => {
      
      this.toast.info(`En bekræftigelsesmail er afsendt til ${this.afAuth.auth.currentUser.email}`,'ℹ️ ')
    }).catch( (err) => {
      
      this.toast.error(err,'Fejl!');
    });
  }

  newUserRoutine() {
    const firebaseUser = this.afAuth.auth.currentUser;
    let userExists = false;
    let u: User;
    
    let observer = this.ufbs.getList().subscribe( userSnapshots => {
      userSnapshots.forEach(userSnapshot => {
        if (userSnapshot.key === firebaseUser.uid) {
          userExists = true;
          u = new User(userSnapshot.payload.val());
          
        }
      });
      if (!userExists) {
        const userEntity: User = new User({"username": firebaseUser.displayName, "email": firebaseUser.email});
        const date = new Date();
        date.setUTCFullYear(2019, 0, 1);
        userEntity.subscribed_until = date;
        this.ufbs.insertUser(userEntity, firebaseUser.uid);
      } else {
        
        if (u.isActivated === false && !this.isDeletingUser) {
          this.toast.warning('Din profil er ikke aktiv. For at aktivere skal du udfylde "Min Profil"','Hov!');
        } 
      }
      observer.unsubscribe();
    });

  }
  
}
