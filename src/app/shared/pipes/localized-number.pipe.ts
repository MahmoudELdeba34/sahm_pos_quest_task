import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'localizedNum',
  standalone: true,
  pure: false
})
export class LocalizedNumberPipe implements PipeTransform {
  private translate = inject(TranslateService);
  private readonly arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const strVal = String(value);
    
    const current = this.translate.currentLang() || this.translate.fallbackLang() || 'en';
    
    if (current === 'ar') {
      return strVal.replace(/[0-9]/g, (d) => this.arabicDigits[parseInt(d, 10)]);
    }
    
    return strVal;
  }
}
