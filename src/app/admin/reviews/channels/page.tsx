"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MoreHorizontal, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  type ChannelCreateInput,
  type ChannelUpdateInput,
  type TrustTier,
  type YoutubeChannel,
  addChannel,
  listChannels,
  updateChannel,
} from "@/lib/api/admin/reviews";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../../admin-states";
import { AdminPageHeader } from "../../admin-page-header";

const tierLabel: Record<TrustTier, string> = { tier_1: "Tier 1", tier_2: "Tier 2" };
const tierBadgeClass: Record<TrustTier, string> = {
  tier_1: "bg-brand-tint text-brand",
  tier_2: "bg-surface-2 text-muted-foreground",
};

export default function AdminReviewChannelsPage() {
  const { token } = useAuth();
  const [channels, setChannels] = useState<YoutubeChannel[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<YoutubeChannel | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listChannels(token)
      .then((res) => {
        if (cancelled) return;
        setChannels(res);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load channels.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Sources"
        description="YouTube channels the review pipeline pulls transcripts from."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            New channel
          </Button>
        }
      />

      <Card className="py-0">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : channels === null ? (
          <AdminLoadingState />
        ) : channels.length === 0 ? (
          <AdminEmptyState title="No channels yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Trust tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {c.channel_img_url ? (
                        <Image
                          src={c.channel_img_url}
                          alt={c.channel_name}
                          width={28}
                          height={28}
                          className="size-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="bg-brand-tint text-brand flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">
                          {c.channel_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.channel_name}</div>
                        <div className="truncate text-[12px] text-muted-foreground">{c.channel_id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={tierBadgeClass[c.trust_tier]}>{tierLabel[c.trust_tier]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={c.active ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}>
                      {c.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                        aria-label="Row actions"
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setEditTarget(c)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AddChannelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => setReloadTick((t) => t + 1)}
      />
      <EditChannelDialog
        channel={editTarget}
        open={editTarget !== null}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={() => setReloadTick((t) => t + 1)}
      />
    </div>
  );
}

function AddChannelDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [url, setUrl] = useState("");
  const [tier, setTier] = useState<TrustTier>("tier_2");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setUrl("");
      setTier("tier_2");
      setActive(true);
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    const input: ChannelCreateInput = { channel_url: url.trim(), trust_tier: tier, active };
    try {
      const created = await addChannel(token, input);
      toast.success(`Added ${created.channel_name}.`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add channel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <FieldGroup>
            <Field>
              <FieldLabel>Channel URL, @handle, or UC… ID</FieldLabel>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/@…"
                required
              />
            </Field>
          </FieldGroup>
          <TierAndActiveFields
            tier={tier}
            setTier={setTier}
            active={active}
            setActive={setActive}
          />
          {error && <p className="text-[13px] font-medium text-negative">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditChannelDialog({
  channel,
  open,
  onOpenChange,
  onSaved,
}: {
  channel: YoutubeChannel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [tier, setTier] = useState<TrustTier>(channel?.trust_tier ?? "tier_2");
  const [active, setActive] = useState(channel?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetSig = channel?.id ?? null;
  const [prevTargetSig, setPrevTargetSig] = useState(targetSig);
  if (targetSig !== prevTargetSig) {
    setPrevTargetSig(targetSig);
    setTier(channel?.trust_tier ?? "tier_2");
    setActive(channel?.active ?? true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !channel) return;
    setSaving(true);
    setError(null);
    const input: ChannelUpdateInput = { trust_tier: tier, active };
    try {
      await updateChannel(token, channel.id, input);
      toast.success(`Updated ${channel.channel_name}.`);
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {channel?.channel_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TierAndActiveFields
            tier={tier}
            setTier={setTier}
            active={active}
            setActive={setActive}
          />
          {error && <p className="text-[13px] font-medium text-negative">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TierAndActiveFields({
  tier,
  setTier,
  active,
  setActive,
}: {
  tier: TrustTier;
  setTier: (t: TrustTier) => void;
  active: boolean;
  setActive: (a: boolean) => void;
}) {
  const tierOptions = [
    { value: "tier_1", label: "Tier 1 (higher trust)" },
    { value: "tier_2", label: "Tier 2" },
  ];
  return (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel>Trust tier</FieldLabel>
          <Select
            items={tierOptions}
            value={tier}
            onValueChange={(v) => setTier(v as TrustTier)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {tierOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <Checkbox checked={active} onCheckedChange={(c) => setActive(c === true)} />
        Active
      </label>
    </>
  );
}
