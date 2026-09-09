export const MMD_RESPONSIVE_STYLES = `
.mmd-relation-toolbar { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.mmd-list-plain { container: mmd-renderer / inline-size; }
.mmd-list-toolbar { display:flex; flex-wrap:wrap; justify-content:space-between; gap:12px; align-items:center; }
.mmd-filter-summary { color:var(--ant-color-text-secondary, #666); font-size:12px; }

.mmd-view-root {
  container: mmd-renderer / inline-size;
  width: 100%;
  min-width: 0;
}

.mmd-view-stack,
.mmd-view-stack > .ant-space-item,
.mmd-container,
.mmd-list-container,
.mmd-form-container,
.mmd-detail-container,
.mmd-list-content,
.mmd-list-content > .ant-space-item,
.mmd-form-content,
.mmd-form-content > .ant-space-item,
.mmd-detail-content,
.mmd-detail-content > .ant-space-item,
.mmd-table-region,
.mmd-table-region .ant-table-wrapper,
.mmd-table-region .ant-spin-nested-loading,
.mmd-table-region .ant-spin-container {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.mmd-list-container .ant-card-body,
.mmd-form-container .ant-card-body,
.mmd-detail-container .ant-card-body {
  min-width: 0;
}

.mmd-table-region .ant-table-content,
.mmd-table-region .ant-table-body {
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
}

.mmd-action-buttons {
  max-width: 100%;
}

.mmd-search-form .ant-form-item,
.mmd-edit-form .ant-form-item,
.mmd-search-form .ant-form-item-control,
.mmd-edit-form .ant-form-item-control,
.mmd-search-form .ant-form-item-control-input-content,
.mmd-edit-form .ant-form-item-control-input-content {
  min-width: 0;
}

.mmd-edit-form .ant-input,
.mmd-edit-form .ant-input-number,
.mmd-edit-form .ant-picker,
.mmd-edit-form .ant-select,
.mmd-search-form .ant-input,
.mmd-search-form .ant-input-number,
.mmd-search-form .ant-picker,
.mmd-search-form .ant-select {
  width: 100%;
  max-width: 100%;
}

.mmd-filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 12px; }
.mmd-filter-grid .ant-form-item { margin: 0; }
.mmd-filter-grid .ant-form-item-hidden { display: none; }
.mmd-filter-grid .ant-form-item-label { padding-bottom: 2px; }
.mmd-filter-form .mmd-search-actions { margin-top: 8px; }
.mmd-filter-inline { display: contents; }
.mmd-reference-option { display: flex; justify-content: space-between; gap: 8px; }
.mmd-reference-pagination { padding: 8px; }
@container mmd-renderer (max-width: 900px) {
  .mmd-filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container mmd-renderer (max-width: 680px) {
  .mmd-list-container > .ant-card-head,
  .mmd-form-container > .ant-card-head,
  .mmd-detail-container > .ant-card-head {
    min-height: 48px;
    padding-inline: 14px;
  }

  .mmd-list-container > .ant-card-body,
  .mmd-form-container > .ant-card-body,
  .mmd-detail-container > .ant-card-body {
    padding: 14px;
  }

  .mmd-search-form.ant-form-inline {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    width: 100%;
  }

  .mmd-search-form.ant-form-inline .ant-form-item {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    margin: 0;
  }

  .mmd-search-form .ant-form-item-label {
    flex: none;
    padding: 0 0 4px;
    text-align: start;
  }

  .mmd-search-form .ant-form-item-control {
    width: 100%;
  }

  .mmd-table-region .ant-table-thead > tr > th,
  .mmd-table-region .ant-table-tbody > tr > td {
    padding: 8px 10px;
  }

  .mmd-descriptions .ant-descriptions-view > table,
  .mmd-descriptions .ant-descriptions-view > table > tbody {
    display: block;
    width: 100%;
  }

  .mmd-descriptions .ant-descriptions-row {
    display: grid;
    grid-template-columns: minmax(7rem, .45fr) minmax(0, 1fr);
    width: 100%;
  }

  .mmd-descriptions .ant-descriptions-item-label,
  .mmd-descriptions .ant-descriptions-item-content {
    display: block;
    width: auto;
    min-width: 0;
  }
}

@container mmd-renderer (max-width: 480px) {
  .mmd-filter-grid { grid-template-columns: minmax(0, 1fr); }
  .mmd-search-form.ant-form-inline {
    grid-template-columns: minmax(0, 1fr);
  }

  .mmd-search-form.ant-form-inline .ant-form-item:last-child,
  .mmd-form-actions {
    width: 100%;
  }

  .mmd-search-actions,
  .mmd-form-actions .mmd-action-buttons {
    display: flex;
    width: 100%;
  }

  .mmd-search-actions > .ant-space-item,
  .mmd-form-actions .mmd-action-buttons > .ant-space-item {
    flex: 1 1 auto;
  }

  .mmd-search-actions .ant-btn,
  .mmd-form-actions .mmd-action-buttons .ant-btn {
    width: 100%;
    min-height: 36px;
  }

  .mmd-table-region .ant-pagination {
    justify-content: center;
    gap: 4px;
  }

  .mmd-table-region .ant-pagination-options,
  .mmd-table-region .ant-pagination-item:not(.ant-pagination-item-active) {
    display: none;
  }

  .mmd-action-buttons .ant-btn {
    min-height: 32px;
    padding-inline: 8px;
  }

  .mmd-descriptions .ant-descriptions-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .mmd-modal-root .ant-modal-wrap {
    overflow: hidden;
  }

  .mmd-modal-root .ant-modal {
    top: 0;
    width: 100% !important;
    max-width: none;
    height: 100dvh;
    margin: 0;
    padding: 0;
  }

  .mmd-modal-root .ant-modal-content {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    min-height: 100%;
    overflow: hidden;
    padding:
      max(16px, env(safe-area-inset-top))
      max(16px, env(safe-area-inset-right))
      max(16px, env(safe-area-inset-bottom))
      max(16px, env(safe-area-inset-left));
    border-radius: 0;
  }

  .mmd-modal-root .ant-modal-header {
    flex: none;
    padding-inline-end: 36px;
  }

  .mmd-modal-root .ant-modal-close {
    top: max(12px, env(safe-area-inset-top));
    inset-inline-end: max(12px, env(safe-area-inset-right));
  }

  .mmd-modal-root .ant-modal-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
}
`;

export function MmdResponsiveStyles() {
  return (
    <style data-mmd-renderer-responsive="true">
      {MMD_RESPONSIVE_STYLES}
    </style>
  );
}
