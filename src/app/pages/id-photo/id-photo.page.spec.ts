import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdPhotoPage } from './id-photo.page';

describe('IdPhotoPage', () => {
  let component: IdPhotoPage;
  let fixture: ComponentFixture<IdPhotoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IdPhotoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
