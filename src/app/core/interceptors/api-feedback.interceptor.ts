import { HttpInterceptorFn, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
export const apiFeedbackInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const injector = inject(Injector);
  const skipToast = req.headers.has('X-Skip-Toast');
  
  if (req.url.includes('/assets/i18n/')) {
    return next(req);
  }
  
  // Create a new request without the custom header before passing to next
  const finalReq = skipToast ? req.clone({ headers: req.headers.delete('X-Skip-Toast') }) : req;

  const getIsAr = () => {
    try {
      const translateService = injector.get(TranslateService);
      return translateService.currentLang() === 'ar' || translateService.fallbackLang() === 'ar';
    } catch {
      return false;
    }
  };

  return next(finalReq).pipe(
    tap((event) => {
      if (!skipToast && event.type === HttpEventType.Response) {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          const isAr = getIsAr();
          toastService.success(isAr ? 'تمت العملية بنجاح' : 'Operation completed successfully');
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      if (!skipToast) {
        const isAr = getIsAr();
        // Extract error message, adapt this to your backend's exact error structure
        let message = isAr ? 'حدث خطأ في النظام. يرجى المحاولة لاحقاً.' : 'A system error occurred. Please try again later.';
        if (error.error && typeof error.error === 'object' && error.error.message) {
           message = error.error.message;
        } else if (error.error && typeof error.error === 'string') {
           message = error.error;
        } else if (error.status === 0) {
           message = isAr ? 'لا يوجد اتصال بالسيرفر. تأكد من اتصالك بالإنترنت.' : 'No connection to the server. Check your internet connection.';
        }
        
        toastService.error(isAr ? 'خطأ!' : 'Error!', message);
      }
      return throwError(() => error);
    })
  );
};
