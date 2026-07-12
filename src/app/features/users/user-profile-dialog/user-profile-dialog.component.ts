import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-user-profile-dialog',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './user-profile-dialog.component.html',
  styleUrl: './user-profile-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileDialogComponent {
  readonly auth = inject(AuthService);
  readonly dialogRef = inject(DialogRef<void>);

  logout(): void {
    this.auth.logout();
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          this.auth.updateAvatar(result);
        }
      };
      reader.readAsDataURL(file);
    }
  }
}
