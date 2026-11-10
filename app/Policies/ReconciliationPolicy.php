<?php

namespace App\Policies;

use App\Models\Reconciliation;
use App\Models\User;

class ReconciliationPolicy
{
    public function viewAny(User $user): bool { return true; }
    public function view(User $user, Reconciliation $reconciliation): bool { return true; }
    public function create(User $user): bool { return true; }
    public function update(User $user, Reconciliation $reconciliation): bool { return true; }
    public function delete(User $user, Reconciliation $reconciliation): bool { return true; }
}
