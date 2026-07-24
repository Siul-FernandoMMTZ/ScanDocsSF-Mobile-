import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllToolsPage } from './all-tools.page';

describe('AllToolsPage', () => {
  let component: AllToolsPage;
  let fixture: ComponentFixture<AllToolsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AllToolsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
