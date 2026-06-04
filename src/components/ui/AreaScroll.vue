<script lang="ts"></script>

<template>
    <div class="overflow-y-auto flex-1 px-6 py-4 space-y-4
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:bg-slate-100
            [&::-webkit-scrollbar-thumb]:bg-slate-400
            [&::-webkit-scrollbar-thumb]:rounded-full
            hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
        <slot />
    </div>
</template>