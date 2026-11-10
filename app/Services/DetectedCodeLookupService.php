<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DetectedCodeLookupService
{
    public function lookup(string $code): array
    {
        $code = strtoupper(trim($code));

        if (preg_match('/^\d{2,6}\/[A-Z]{1,8}-PO\/\d{1,2}\/\d{4}$/', $code)) {
            return $this->purchaseOrder($code);
        }

        if (preg_match('/^(OP|TX|PF|BL|RE|PAY)-[A-Z0-9]+(?:-[A-Z0-9]+)*$/', $code)) {
            return $this->cashAdvance($code);
        }

        throw ValidationException::withMessages(['code' => 'Format kode PO atau prefix tidak valid.']);
    }

    private function purchaseOrder(string $code): array
    {
        $connection = DB::connection('bmt_multisales');
        $order = $connection->table('purchase_order')->where('po_no', $code)->first([
            'id', 'po_no', 'po_date', 'title', 'summary', 'jenis_barang', 'brand', 'currency',
            'discount', 'other_charge', 'ppn_value', 'pph_value', 'approved', 'is_complete',
        ]);

        if (!$order) {
            return ['code' => $code, 'kind' => 'po', 'source' => 'bmt-multisales', 'found' => false, 'items' => []];
        }

        $items = $connection->table('purchase_order_item')
            ->where('purchase_order_id', $order->id)
            ->where('active', 1)
            ->orderBy('order_no')
            ->get(['id', 'item_id', 'order_qty', 'price_per_item', 'complete_qty'])
            ->map(fn ($item) => [
                'name' => 'Item #' . $item->item_id,
                'description' => null,
                'quantity' => (float) $item->order_qty,
                'unitPrice' => (float) $item->price_per_item,
                'subtotal' => (float) $item->order_qty * (float) $item->price_per_item,
                'completedQuantity' => (float) $item->complete_qty,
            ])->values()->all();

        return [
            'code' => $code,
            'kind' => 'po',
            'source' => 'bmt-multisales',
            'found' => true,
            'title' => $order->title,
            'description' => $order->summary ?: $order->jenis_barang,
            'date' => $order->po_date,
            'currency' => $order->currency ?: 'IDR',
            'status' => $order->is_complete ? 'Selesai' : ((int) $order->approved === 3 ? 'Disetujui' : 'Dalam proses'),
            'items' => $items,
            'total' => array_sum(array_column($items, 'subtotal')),
            'discount' => (float) ($order->discount ?? 0),
            'otherCharge' => (float) ($order->other_charge ?? 0),
            'tax' => (float) ($order->ppn_value ?? 0) - (float) ($order->pph_value ?? 0),
        ];
    }

    private function cashAdvance(string $code): array
    {
        $connection = DB::connection('bmt_finance');
        $advance = $connection->table('cash_advances')
            ->where('ticket_no', $code)
            ->whereNull('deleted_at')
            ->first(['id', 'ticket_no', 'type', 'issue_type', 'title', 'description', 'reference_po', 'date', 'status']);

        if (!$advance) {
            return ['code' => $code, 'kind' => 'prefix', 'source' => 'bmt-finance', 'found' => false, 'items' => []];
        }

        $items = $connection->table('cash_advance_items')
            ->where('cash_advance_id', $advance->id)
            ->where('is_active', 1)
            ->orderBy('id')
            ->get(['item_name', 'unit_price', 'quantity', 'subtotal_price', 'description'])
            ->map(fn ($item) => [
                'name' => $item->item_name,
                'description' => $item->description,
                'quantity' => (float) $item->quantity,
                'unitPrice' => (float) $item->unit_price,
                'subtotal' => (float) $item->subtotal_price,
            ])->values()->all();

        return [
            'code' => $code,
            'kind' => 'prefix',
            'source' => 'bmt-finance',
            'found' => true,
            'title' => $advance->title,
            'description' => $advance->description,
            'date' => $advance->date,
            'status' => $advance->status,
            'currency' => 'IDR',
            'type' => $advance->type,
            'issueType' => $advance->issue_type,
            'referencePo' => $advance->reference_po,
            'items' => $items,
            'total' => array_sum(array_column($items, 'subtotal')),
        ];
    }
}
