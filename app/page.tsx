"use client";

import { useEffect, useState } from "react";
import { Search, Database, Package, FileSpreadsheet, Box, Archive, ShoppingCart, RefreshCw, X } from "lucide-react";
import { ProductRecord } from "@/lib/types";

function parseSourceMetadata(metadata: unknown) {
  if (typeof metadata !== "string" || !metadata.trim()) {
    return null;
  }

  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function getSourceCustomerName(source: any) {
  const metadata = parseSourceMetadata(source?.metadata);
  return String(metadata?.customerName ?? "").trim();
}

export default function Home() {
  const [stats, setStats] = useState({
    productCount: 0,
    sourceCount: 0,
    searchCount: 0,
    packingOrderCount: 0
  });
  
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadProducts();
  }, []);

  async function loadStats() {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadProducts(q?: string) {
    setIsLoading(true);
    try {
      const res = await fetch(q ? `/api/products?q=${encodeURIComponent(q)}` : '/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
        if (data.items && data.items.length > 0) {
          setSelectedProductId(data.items[0].id);
        } else {
          setSelectedProductId(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div className="page-header-icon">
          <Package size={20} />
        </div>
        <div className="page-header-text">
          <h2>Tổng quan hệ thống</h2>
          <p>Chào mừng đến với hệ thống Information Logistics.</p>
        </div>
      </div>

      {/* STATS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div className="page-header-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb', margin: 0 }}>
              <Box size={24} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Tổng Hàng Hóa</p>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>{stats.productCount}</h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div className="page-header-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', margin: 0 }}>
              <Database size={24} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Nguồn Dữ Liệu</p>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>{stats.sourceCount}</h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div className="page-header-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706', margin: 0 }}>
              <Search size={24} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Lượt Tra Cứu</p>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>{stats.searchCount}</h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div className="flex items-center gap-4">
            <div className="page-header-icon" style={{ backgroundColor: '#faf5ff', color: '#9333ea', margin: 0 }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Packing List Xuất</p>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>{stats.packingOrderCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 className="card-title">Danh sách hàng hóa</h3>
            <p className="hint" style={{ margin: 0 }}>Xem toàn bộ cơ sở dữ liệu hàng hóa trên hệ thống.</p>
          </div>
          <div className="flex items-center gap-2" suppressHydrationWarning>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Tìm kiếm nhanh..." 
                style={{ paddingLeft: '32px', width: '250px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadProducts(searchQuery)}
              />
              {searchQuery && (
                <button 
                  style={{ position: 'absolute', right: '8px', top: '10px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    setSearchQuery("");
                    loadProducts("");
                  }}
                >
                  <X size={14} style={{ opacity: 0.5 }} />
                </button>
              )}
            </div>
            <button className="btn btn-outline" onClick={() => loadProducts(searchQuery)}>Lọc</button>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {isLoading ? (
            <div className="flex items-center justify-center" style={{ padding: '40px', color: 'var(--muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ marginRight: '8px' }} /> Đang tải dữ liệu...
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center" style={{ padding: '40px', color: 'var(--muted)' }}>
              Không tìm thấy sản phẩm nào.
            </div>
          ) : (
            <div style={{ display: 'flex', minHeight: '600px', maxHeight: '700px' }}>
              {/* LEFT PANE - PRODUCT LIST */}
              <div style={{ width: '35%', borderRight: '1px solid var(--line)', overflowY: 'auto' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--line)', backgroundColor: '#f8fafc', fontWeight: 600, fontSize: '0.9rem', color: 'var(--muted)', position: 'sticky', top: 0, zIndex: 5 }}>
                  DANH MỤC HÀNG HÓA ({products.length})
                </div>
                {products.length === 0 ? (
                  <div className="text-center" style={{ padding: '24px', color: 'var(--muted)' }}>Không có dữ liệu hàng hóa.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {products.map((p, idx) => {
                      const isSelected = selectedProductId === p.id;
                      const sourceCount = (p.baseInfo ? 1 : 0) + (p.declarationHistory ? p.declarationHistory.length : 0);
                      return (
                        <div 
                          key={p.id}
                          onClick={() => setSelectedProductId(p.id)}
                          style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--line)',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#eff6ff' : 'white',
                            borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--primary)' : 'inherit', flex: 1 }}>
                              {idx + 1}. {p.name}
                            </div>
                            <div className="badge" style={{ backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#1e40af' : '#64748b', flexShrink: 0 }}>
                              {sourceCount} nguồn
                            </div>
                          </div>
                          {p.aliases && Array.isArray(p.aliases) && p.aliases.length > 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '8px' }}>
                              Alias: {p.aliases.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* RIGHT PANE - SOURCES & DETAILS */}
              <div style={{ width: '65%', overflowY: 'auto', backgroundColor: '#fafafa', position: 'relative' }}>
                {products.find(p => p.id === selectedProductId) ? (() => {
                  const selectedProduct = products.find(p => p.id === selectedProductId)!;
                  return (
                  <>
                    <div style={{ padding: '20px 24px', backgroundColor: 'white', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--foreground)' }}>{selectedProduct.name}</h2>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {selectedProduct.baseInfo && <span className="badge badge-primary">Thông tin cơ sở</span>}
                          {selectedProduct.declarationHistory && selectedProduct.declarationHistory.length > 0 && (
                            <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{selectedProduct.declarationHistory.length} Packing List</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ padding: '24px' }}>
                      <h4 style={{ margin: '0 0 16px 0', color: 'var(--muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Chi tiết Nguồn dữ liệu
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {selectedProduct.baseInfo && (
                          <div className="card" style={{ border: '1px solid #c7d2fe', boxShadow: 'none', margin: 0 }}>
                            <div className="card-header flex justify-between items-center" style={{ backgroundColor: '#e0e7ff', padding: '12px 16px' }}>
                              <h3 className="card-title" style={{ fontSize: '0.9rem', color: '#3730a3', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database size={16} /> Cơ sở (Manual/Base)
                              </h3>
                            </div>
                            <div className="card-body" style={{ padding: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                                <div><span style={{ color: 'var(--muted)' }}>Xuất xứ:</span> <strong>{selectedProduct.baseInfo.origin || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Thương hiệu:</span> <strong>{selectedProduct.baseInfo.brand || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>HS Code:</span> <strong>{selectedProduct.baseInfo.hsCode || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Trọng lượng:</span> <strong>{selectedProduct.baseInfo.unitWeightKg || '-'} kg/{selectedProduct.baseInfo.unit || 'đv'}</strong></div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {selectedProduct.declarationHistory?.map((src: any, i: number) => (
                          <div key={src.id || i} className="card" style={{ border: '1px solid #bbf7d0', boxShadow: 'none', margin: 0 }}>
                            <div className="card-header flex justify-between items-center" style={{ backgroundColor: '#dcfce7', padding: '12px 16px' }}>
                              <h3 className="card-title" style={{ fontSize: '0.9rem', color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileSpreadsheet size={16} /> {getSourceCustomerName(src) || 'Khách hàng chưa có'} • Số PK: {src.referenceCode || '-'}
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', marginLeft: '8px', backgroundColor: 'rgba(255,255,255,0.75)', padding: '3px 10px', borderRadius: '999px' }}>
                                  {src.declaredAt ? new Date(src.declaredAt).toLocaleDateString('vi-VN') : ''}
                                </span>
                              </h3>
                            </div>
                            <div className="card-body" style={{ padding: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                                <div><span style={{ color: 'var(--muted)' }}>Xuất xứ:</span> <strong>{src.origin || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Thương hiệu:</span> <strong>{src.brand || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>HS Code:</span> <strong>{src.hsCode || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Trọng lượng:</span> <strong>{src.unitWeightKg || '-'} kg/{src.unit || 'đv'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Số lượng:</span> <strong>{src.quantity || '-'}</strong></div>
                                <div><span style={{ color: 'var(--muted)' }}>Tổng N.W:</span> <strong>{src.totalWeightKg || '-'} kg</strong></div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {(!selectedProduct.baseInfo && (!selectedProduct.declarationHistory || selectedProduct.declarationHistory.length === 0)) && (
                          <div className="text-center" style={{ padding: '40px', color: 'var(--muted)', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed var(--line)' }}>
                            Chưa có dữ liệu nguồn cho sản phẩm này.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                  );
                })() : (
                  <div className="flex items-center justify-center h-full" style={{ color: 'var(--muted)' }}>
                    <div className="text-center">
                      <Box size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                      <p>Chọn một sản phẩm để xem chi tiết</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
