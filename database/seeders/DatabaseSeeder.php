<?php

namespace Database\Seeders;

use App\Models\Reference;
use App\Models\Reconciliation;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([['A7K29QD', 'Pembelian ATK & perlengkapan kantor', 1250000], ['8PM3LZ2', 'Transport proyek instalasi panel', 450000], ['Q4TX91B', 'Konsumsi rapat vendor', 2100000], ['M2N8C5R', 'Pembelian material kabel & konektor', 3675000], ['Z9B6W3E', 'Biaya perbaikan peralatan workshop', 1890000], ['K7D4F1H', 'Pembayaran jasa pengiriman barang', 725000]] as [$code, $description, $amount]) Reference::firstOrCreate(['code' => $code], compact('description', 'amount'));

        foreach (range(2, 0) as $offset) {
            $period = now()->startOfMonth()->subMonths($offset);
            $reconciliation = Reconciliation::firstOrCreate(['month' => $period->month, 'year' => $period->year], ['file_name' => 'mutasi-bca-'.$period->format('Y-m').'.xlsx', 'uploaded_at' => $period->copy()->endOfMonth()]);
            if ($reconciliation->transactions()->exists()) continue;
            $rows = [
                ['day' => 1, 'description' => 'SETORAN TUNAI TOP UP PETTY CASH PROCUREMENT', 'amount' => 25000000, 'type' => 'CR', 'keywords' => []],
                ['day' => 3, 'description' => 'TRSF E-BANKING DB OP-A7K29QD PEMBELIAN ATK', 'amount' => 1250000, 'type' => 'DB', 'keywords' => [['kind' => 'prefix', 'value' => 'OP-A7K29QD', 'prefix' => 'OP']]],
                ['day' => 6, 'description' => 'KARTU DEBIT TX-8PM3LZ2 TRANSPORT PROYEK', 'amount' => 450000, 'type' => 'DB', 'keywords' => [['kind' => 'prefix', 'value' => 'TX-8PM3LZ2', 'prefix' => 'TX']]],
                ['day' => 12, 'description' => 'TRSF E-BANKING DB PAY-Q4TX91B VENDOR KONSUMSI', 'amount' => 2100000, 'type' => 'DB', 'keywords' => [['kind' => 'prefix', 'value' => 'PAY-Q4TX91B', 'prefix' => 'PAY']]],
                ['day' => 19, 'description' => 'BIAYA ADM BULANAN', 'amount' => 15000, 'type' => 'DB', 'keywords' => []],
            ];
            $balance = 20000000;
            $reconciliation->transactions()->createMany(array_map(function (array $row) use ($period, &$balance): array {
                $balance += $row['type'] === 'CR' ? $row['amount'] : -$row['amount'];
                return ['transaction_date' => $period->copy()->day($row['day'])->format('Y-m-d'), 'description' => $row['description'], 'branch' => '0000', 'amount' => $row['amount'], 'type' => $row['type'], 'balance' => $balance, 'keywords' => $row['keywords']];
            }, $rows));
        }
    }
}
