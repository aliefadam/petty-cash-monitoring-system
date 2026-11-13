<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Data Monitoring PO</title>
    <style>
        @page { margin: 28px 30px 34px; }
        body { font-family: DejaVu Sans, sans-serif; color: #26364d; font-size: 9px; }
        .heading { border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 12px; }
        .brand { color: #1d4ed8; font-size: 9px; font-weight: bold; letter-spacing: .5px; text-transform: uppercase; }
        h1 { font-size: 18px; margin: 4px 0; }
        .meta { color: #64748b; font-size: 8px; }
        .filters { margin: 8px 0 12px; color: #475569; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        th { background: #eff6ff; color: #475569; text-transform: uppercase; font-size: 8px; text-align: left; }
        th, td { border: 1px solid #dbe4ef; padding: 6px 7px; vertical-align: top; }
        tr { page-break-inside: avoid; }
        .center { text-align: center; }
        .right { text-align: right; white-space: nowrap; }
        .key { font-size: 8px; line-height: 1.55; }
        .muted { color: #94a3b8; }
        .incoming { color: #059669; font-weight: bold; }
        .outgoing { color: #e11d48; font-weight: bold; }
        .footer { margin-top: 8px; color: #64748b; font-size: 8px; text-align: right; }
    </style>
</head>
<body>
    <div class="heading">
        <div class="brand">Sistem Monitoring Petty Cash Procurement</div>
        <h1>Data Monitoring PO</h1>
        <div class="meta">{{ $transactions->count() }} baris · Dibuat {{ $generatedAt->format('d M Y H:i') }}</div>
    </div>

    @if($filterLabels->isNotEmpty())
        <div class="filters"><strong>Filter aktif:</strong>
            @foreach($filterLabels as $label => $value)
                {{ $label }}: {{ $value }}@if(!$loop->last) &nbsp; | &nbsp; @endif
            @endforeach
        </div>
    @endif

    <table>
        <thead>
            <tr>
                <th style="width: 4%">No</th>
                <th style="width: 10%">Tgl Transaksi</th>
                <th style="width: 21%">Internal Key</th>
                <th style="width: 24%">Title</th>
                <th style="width: 8%" class="center">Tipe</th>
                <th style="width: 12%" class="right">Jumlah</th>
                <th style="width: 12%" class="right">Saldo</th>
                <th style="width: 9%">Reimburse</th>
            </tr>
        </thead>
        <tbody>
            @forelse($transactions as $index => $transaction)
                @php
                    $keys = collect([
                        'INV' => $transaction->inv,
                        'TL' => $transaction->tl,
                        'RFQ' => $transaction->rfq,
                        'PR' => $transaction->pr,
                        'PO' => $transaction->po,
                        'SURAT NO' => $transaction->surat_no,
                        'NO. REFERENSI' => $transaction->reference_code,
                    ])->filter(fn ($value) => filled($value));
                    $isIncoming = $transaction->type === 'DB';
                    $amount = $isIncoming ? ($transaction->debit ?? $transaction->amount) : ($transaction->credit ?? $transaction->amount);
                @endphp
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $transaction->transaction_date->format('d M Y') }}</td>
                    <td class="key">@forelse($keys as $label => $value)<strong>{{ $label }}</strong> {{ $value }}<br>@empty<span class="muted">-</span>@endforelse</td>
                    <td>{{ $transaction->title ?: '—' }}</td>
                    <td class="center">{{ $isIncoming ? 'Debit · Masuk' : 'Kredit · Keluar' }}</td>
                    <td class="right {{ $isIncoming ? 'incoming' : 'outgoing' }}">{{ $isIncoming ? '+' : '−' }} Rp {{ number_format((float) $amount, 0, ',', '.') }}</td>
                    <td class="right">{{ $transaction->balance !== null ? 'Rp ' . number_format((float) $transaction->balance, 0, ',', '.') : '—' }}</td>
                    <td>{{ $transaction->reimburse ?: '—' }}</td>
                </tr>
            @empty
                <tr><td colspan="8" class="center muted">Tidak ada data yang sesuai dengan filter.</td></tr>
            @endforelse
        </tbody>
    </table>
    <div class="footer">Sistem Monitoring Petty Cash Procurement</div>
</body>
</html>
