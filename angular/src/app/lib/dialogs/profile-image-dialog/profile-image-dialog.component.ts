import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DialogData } from 'src/app/create-new-event/create-new-event.component';

@Component({
  selector: 'app-profile-image-dialog',
  templateUrl: './profile-image-dialog.component.html',
  styleUrls: ['./profile-image-dialog.component.css']
})
export class ProfileImageDialogComponent implements OnInit {

  pictureUrl: string = '';

  constructor(
    public dialogRef: MatDialogRef<ProfileImageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
      this.pictureUrl = data.pictureUrl;
    }

  ngOnInit() {
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
