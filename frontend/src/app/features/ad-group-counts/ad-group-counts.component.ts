/**
 * File: features/ad-group-counts/ad-group-counts.component.ts
 * Mục đích: Hiển thị 3 cột: Sản phẩm | Số nhóm QC đang hoạt động | Số nhóm QC tạm dừng
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../product/product.service';
import { AdGroupService } from '../ad-group/ad-group.service';

interface Row {
  productId: string;
  productName: string;
  active: number;
  inactive: number;
}

@Component({
  selector: 'app-ad-group-counts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ad-group-counts.component.html',
  styleUrls: ['./ad-group-counts.component.css']
})
export class AdGroupCountsComponent implements OnInit {
  rows = signal<Row[]>([]);
  isLoading = signal(false);

  // Totals for summary chips
  totalActive = computed(() => this.rows().reduce((sum, r) => sum + (r.active || 0), 0));
  totalInactive = computed(() => this.rows().reduce((sum, r) => sum + (r.inactive || 0), 0));
  totalProducts = computed(() => this.rows().length);

  constructor(
    private productService: ProductService,
    private adGroupService: AdGroupService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    // Fetch products and counts in parallel
    this.productService.getAll().subscribe({
      next: (products) => {
        this.adGroupService.getCountsByProduct().subscribe({
          next: (counts) => {
            const map: Record<string, { active: number; inactive: number }> = {};
            for (const c of counts || []) map[c.productId] = { active: c.active, inactive: c.inactive };
            const rows: Row[] = (products || []).map((p: any) => ({
              productId: p._id,
              productName: p.name,
              active: map[p._id]?.active || 0,
              inactive: map[p._id]?.inactive || 0,
            }));
            this.rows.set(rows);
            this.isLoading.set(false);
          },
          error: () => { this.rows.set([]); this.isLoading.set(false); }
        });
      },
      error: () => { this.rows.set([]); this.isLoading.set(false); }
    });
  }

  refresh(): void {
    this.load();
  }
}
