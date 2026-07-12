import { Injectable, inject } from '@angular/core';
import { Dialog, DialogConfig } from '@angular/cdk/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);

  async confirm(data: ConfirmDialogData, config?: any): Promise<boolean> {
    const dialogRef = this.dialog.open<boolean>(ConfirmDialogComponent, {
      data,
      disableClose: true, // Force the user to click a button
      ...config,
    });
    
    const result = await firstValueFrom(dialogRef.closed);
    return result === true;
  }
}
