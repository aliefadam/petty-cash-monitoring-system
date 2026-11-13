<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DetectedCodeLookupService
{
    public function lookup(string $code, ?string $kind = null): array
    {
        $code = strtoupper(trim($code));

        if ($kind === 'rfq') {
            return $this->requestForQuote($code);
        }

        if ($kind === 'pr') {
            return $this->purchaseRequest($code);
        }

        if ($kind === 'po' || preg_match('/^\d{2,6}\/[A-Z]{1,8}-PO\/\d{1,2}\/\d{4}$/', $code)) {
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
            ->leftJoin('m_item', 'm_item.id', '=', 'purchase_order_item.item_id')
            ->where('purchase_order_item.purchase_order_id', $order->id)
            ->where('purchase_order_item.active', 1)
            ->orderBy('purchase_order_item.order_no')
            ->get(['purchase_order_item.id', 'purchase_order_item.item_id', 'm_item.item_name', 'purchase_order_item.order_qty', 'purchase_order_item.price_per_item', 'purchase_order_item.complete_qty'])
            ->map(fn ($item) => [
                'name' => $item->item_name ?: 'Item #' . $item->item_id,
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

    private function requestForQuote(string $code): array
    {
        $connection = DB::connection('bmt_multisales');
        $rfq = $connection->table('rfq_header')->where('rfq_no', $code)->first([
            'id', 'rfq_no', 'title', 'status', 'created_date', 'reference_no', 'rfq_group', 'item_no', 'item_description', 'pr_no', 'allocation',
        ]);

        if (!$rfq) {
            return ['code' => $code, 'kind' => 'rfq', 'source' => 'bmt-multisales', 'found' => false, 'items' => []];
        }

        $itemName = $rfq->item_no
            ? $connection->table('m_item')->where('item_no', $rfq->item_no)->value('item_name')
            : null;
        $description = collect([
            $itemName ? 'Nama barang: ' . $itemName : null,
            $rfq->item_description ? 'Jenis barang: ' . $rfq->item_description : null,
            $rfq->reference_no ? 'Referensi: ' . $rfq->reference_no : null,
            $rfq->rfq_group ? 'Grup: ' . $rfq->rfq_group : null,
            $rfq->pr_no ? 'PR: ' . $rfq->pr_no : null,
            $rfq->allocation ? 'Alokasi: ' . $rfq->allocation : null,
        ])->filter()->implode("\n");

        return [
            'code' => $code,
            'kind' => 'rfq',
            'source' => 'bmt-multisales',
            'found' => true,
            'title' => $rfq->title ?: ($itemName ?: $rfq->rfq_no),
            'description' => $description ?: null,
            'date' => $rfq->created_date,
            'status' => $rfq->status,
            'currency' => 'IDR',
            'items' => [],
        ];
    }

    private function purchaseRequest(string $code): array
    {
        $connection = DB::connection('bmt_multisales');
        $pr = $connection->table('pr')->where('pr_no', $code)->first([
            'id', 'pr_no', 'pr_subject', 'status', 'pr_date', 'currency', 'pr_notes', 'rfq_id', 'allocation',
        ]);

        if (!$pr) {
            return ['code' => $code, 'kind' => 'pr', 'source' => 'bmt-multisales', 'found' => false, 'items' => []];
        }

        $items = $connection->table('pr_part as part')
            ->leftJoin('m_item as item', 'item.id', '=', 'part.item_id')
            ->leftJoin('pr_subledger as subledger', 'subledger.pr_part_id', '=', 'part.id')
            ->where('part.pr_id', $pr->id)
            ->where('part.flag', 1)
            ->where(function ($query) {
                $query->whereNull('subledger.id')->orWhere('subledger.flag', 1);
            })
            ->orderBy('part.order_no')
            ->orderBy('subledger.id')
            ->get([
                'part.id', 'part.item_id', 'item.item_name', 'item.item_no',
                'subledger.qty', 'subledger.unit_price', 'subledger.description as item_description',
            ])
            ->map(fn ($item) => [
                'name' => $item->item_name ?: ($item->item_no ?: 'Item #' . $item->item_id),
                'description' => $item->item_description,
                'quantity' => (float) ($item->qty ?? 0),
                'unitPrice' => (float) ($item->unit_price ?? 0),
                'subtotal' => (float) ($item->qty ?? 0) * (float) ($item->unit_price ?? 0),
            ])->values()->all();

        return [
            'code' => $code,
            'kind' => 'pr',
            'source' => 'bmt-multisales',
            'found' => true,
            'title' => $pr->pr_subject ?: $pr->pr_no,
            'description' => $pr->pr_notes,
            'date' => $pr->pr_date,
            'status' => $pr->status === null ? null : (string) $pr->status,
            'currency' => $pr->currency ?: 'IDR',
            'items' => $items,
            'total' => array_sum(array_column($items, 'subtotal')),
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
