import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const toastService = this.injector.get(ToastService);
    
    // Log to console for debugging
    console.error('Global Error Caught:', error);
    
    // Extract message
    const message = error.message ? error.message : error.toString();
    
    // Show a user-friendly toast (preventing the white screen of death silently)
    toastService.error('حدث خطأ غير متوقع', message);
  }
}
