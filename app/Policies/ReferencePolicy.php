<?php

namespace App\Policies;

use App\Models\Reference;
use App\Models\User;

class ReferencePolicy
{
    public function viewAny(User $user): bool { return true; }
    public function create(User $user): bool { return true; }
    public function delete(User $user, Reference $reference): bool { return true; }
}
