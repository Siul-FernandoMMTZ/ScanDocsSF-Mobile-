import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OcrPage } from './ocr.page';

describe('OcrPage', () => {
  let component: OcrPage;
  let fixture: ComponentFixture<OcrPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OcrPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
