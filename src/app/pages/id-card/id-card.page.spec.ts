import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdCardPage } from './id-card.page';

describe('IdCardPage', () => {
  let component: IdCardPage;
  let fixture: ComponentFixture<IdCardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IdCardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
