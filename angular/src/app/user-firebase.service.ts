import { Injectable } from '@angular/core';

import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase/app';

import { Observable } from '../../node_modules/rxjs';
import { AngularFireDatabase, AngularFireList  } from '../../node_modules/@angular/fire/database';
import { Time } from '@angular/common';
import { timestamp } from 'rxjs/internal/operators/timestamp';

// Entity
import { User, Gender } from './entity/user/user';

// Helper classes
import { JsonConverter } from './entity/helper/json-converter';

// Session storage
import { SessionStorage, SessionStorageService } from 'angular-web-storage';
import { UserRoleService } from './user-role.service';

@Injectable({
  providedIn: 'root'
})
export class UserFirebaseService {

  dbPath: string = '/users/';

  usersObservable: Observable<any[]>;

  jsonConverter: JsonConverter = new JsonConverter();

  constructor(public afAuth: AngularFireAuth, private db: AngularFireDatabase, 
    public session: SessionStorageService, private urs: UserRoleService) { }

  // CRUD

  
  getUsers() {
    this.usersObservable = this.getList();
  }


  getList() {
    return this.db.list(this.dbPath).snapshotChanges();
  }


  getUserByID(id: string) {
    return this.db.object(this.dbPath+id).valueChanges();
  }

  //Test passed
  insertUser(user: User, id: string): Promise<void> {
    this.urs.insertRole({fk_id: id, type: this.urs.userTypes.MEMBER});
    return this.db.object(this.dbPath + id).update(user)
   }
 
   updateUser(objwithUpdates, id: string) {
      return this.db.object(this.dbPath+id).update(objwithUpdates);
   }
 
   deleteUser(key: string) {
      return this.db.object(this.dbPath+key).remove();
   }

   // Session storage
   setStorage(user: User, expired: number = 0) {
    this.session.set("user", user, expired, 's');
   }

   getStorage(): User {
     let user =  this.session.get("user");
     return user;
   }

   private objToJSON(userObject : User): string {
     return JSON.parse(JSON.stringify(userObject));
   }

   private jsonToObj(json: string) : User {
     let obj : User = this.jsonConverter.convertJsonToUserObj(json);
     return obj;
   }

   convertEmailToKey(email: string) : string {
    return email.replace('.', '¤').replace('@', '%');
   }

   convertKeyToEmail(key: string) {
    return key.replace('¤','.').replace('%', '@');
   }

   clearSession() {
    this.session.remove("user");
   }

   userDistribution(userList) {
     let dist = {male: 0, female:0};
     userList.forEach(user => {
      if (user.gender === Gender.MALE) {
        dist.male++;
      } else {
        dist.female++;
      }
     });
     return dist;
   }

}
