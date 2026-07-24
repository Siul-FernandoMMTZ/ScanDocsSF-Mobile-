import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfToolsPage } from './pdf-tools.page';

describe('PdfToolsPage', () => {
  let component: PdfToolsPage;
  let fixture: ComponentFixture<PdfToolsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PdfToolsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
