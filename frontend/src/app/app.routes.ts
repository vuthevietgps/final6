/**
 * File: app/app.routes.ts
 * Mục đích: Định nghĩa route của ứng dụng (client-side routing).
 */
import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    redirectTo: '/users',
    pathMatch: 'full'
  },
  {
    path: 'users',
    loadChildren: () => import('./features/user/user.routes').then(m => m.userRoutes)
  },
  {
    path: 'production-status',
    loadComponent: () => import('./features/production-status/production-status.component').then(m => m.ProductionStatusComponent)
  },
  {
    path: 'orders',
    children: [
  { path: 'test2', loadComponent: () => import('./features/test-order2/test-order2.component').then(m => m.TestOrder2Component) },
      { path: 'test', loadComponent: () => import('./features/test-order/test-order.component').then(m => m.TestOrderComponent) },
      { path: '', loadComponent: () => import('./features/order-status/order-status.component').then(m => m.OrderStatusComponent) }
    ]
  },
  {
    path: 'delivery-status',
    loadComponent: () => import('./features/delivery-status/delivery-status.component').then(m => m.DeliveryStatusComponent)
  },
  {
    path: 'product-category',
    loadComponent: () => import('./features/product-category/product-category.component').then(m => m.ProductCategoryComponent)
  },
  {
    path: 'product',
    loadComponent: () => import('./features/product/product.component').then(m => m.ProductComponent)
  },
  {
    path: 'quotes',
    loadComponent: () => import('./features/quote/quote.component').then(m => m.QuoteComponent)
  },
  {
    path: 'ad-groups',
    loadComponent: () => import('./features/ad-group/ad-group.component').then(m => m.AdGroupComponent)
  },
  {
    path: 'ad-accounts',
    loadComponent: () => import('./features/ad-account/ad-account.component').then(m => m.AdAccountComponent)
  },
  {
    path: 'ad-group-counts',
    loadComponent: () => import('./features/ad-group-counts/ad-group-counts.component').then(m => m.AdGroupCountsComponent)
  },
  {
    path: 'costs',
    children: [
  { path: 'advertising2', loadComponent: () => import('./features/advertising-cost2/advertising-cost2.component').then(m => m.AdvertisingCost2Component) },
  { path: 'labor1', loadComponent: () => import('./features/labor-cost1/labor-cost1.component').then(m => m.LaborCost1Component) },
      { path: 'other', loadComponent: () => import('./features/other-cost/other-cost.component').then(m => m.OtherCostComponent) },
  { path: 'salary', loadComponent: () => import('./features/salary-config/salary-config.component').then(m => m.SalaryConfigComponent) },
      {
        path: ':type',
        loadComponent: () => import('./core/components/coming-soon.component').then(m => m.ComingSoonComponent),
        data: { prerender: false }
      },
      {
        path: '',
        redirectTo: 'other',
        pathMatch: 'full'
  },
    ]
  },
  {
    path: 'profit',
    loadComponent: () => import('./core/components/coming-soon.component').then(m => m.ComingSoonComponent)
  },
  {
    path: 'reports',
    children: [
  { path: 'ad-group-profit', loadComponent: () => import('./features/ad-group-profit/ad-group-profit.component').then(m => m.AdGroupProfitComponent) },
      { path: 'ad-group-profit-report', loadComponent: () => import('./features/ad-group-profit-report/ad-group-profit-report.component').then(m => m.AdGroupProfitReportComponent) },
      { path: 'summary1', loadComponent: () => import('./features/summary1/summary1.component').then(m => m.Summary1Component) },
      { path: 'summary2', loadComponent: () => import('./features/summary2/summary2.component').then(m => m.Summary2Component) },
      { path: 'product-profit', loadComponent: () => import('./features/product-profit-report/product-profit-report.component').then(m => m.ProductProfitReportComponent) },
  { path: '', redirectTo: 'ad-group-profit-report', pathMatch: 'full' }
    ]
  },
  {
    path: 'settings',
    loadComponent: () => import('./core/components/coming-soon.component').then(m => m.ComingSoonComponent)
  },
  {
    path: '**',
    redirectTo: '/users'
  }
];
