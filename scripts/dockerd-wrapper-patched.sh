#!/usr/bin/env bash
# Host-side wrapper: snap dockerd-wrapper fails mktemp on tmpfs /tmp in confinement.
set -Eeuo pipefail

export SNAP="${SNAP:-/snap/docker/current}"
export SNAP_DATA="${SNAP_DATA:-/var/snap/docker/3618}"
export SNAP_COMMON="${SNAP_COMMON:-/var/snap/docker/common}"
export SNAP_INSTANCE_NAME="${SNAP_INSTANCE_NAME:-docker}"
export PATH="/snap/docker/current/bin:${PATH}"

workaround_apparmor_profile_reload() {
	local aa_profile_reloaded="$SNAP_COMMON/profile_reloaded"
	if [ ! -f "$aa_profile_reloaded" ]; then
		local aa_count
		if aa_count="$(grep -c 'docker-default (enforce)' /sys/kernel/security/apparmor/profiles)" && [ -n "$aa_count" ] && [ "$aa_count" -ge 1 ]; then
			export DOCKER_AA_RELOAD=1
			touch "$aa_profile_reloaded"
		fi
	fi
}

default_socket_group='docker'
workaround_lp1606510() {
	local getent_group_docker_snap
	if getent_group_docker_snap="$(getent group docker-snap | awk -F':' '{print $NF}')" && [ -n "$getent_group_docker_snap" ]; then
		default_socket_group='docker-snap'
	fi
}

yolo() {
	"$@" > /dev/null 2>&1 || :
}

force_umount() {
	yolo umount    "$@"
	yolo umount -f "$@"
	yolo umount -l "$@"
}

mkdir -p "$SNAP_COMMON/tmp"
_tmp_dir="$SNAP_COMMON/tmp"

dir="$(mktemp -d -p "$_tmp_dir")"
upper="$(mktemp -d -p "$_tmp_dir")"
lower="$(mktemp -d -p "$_tmp_dir")"
work="$(mktemp -d -p "$_tmp_dir")"

trap "force_umount --no-mtab '$dir'; rm -rf '$dir'" EXIT
yolo mount --no-mtab -t overlay /dev/null -olowerdir="$lower",upperdir="$upper",workdir="$work" "$dir"
force_umount --no-mtab "$dir"
yolo mount --no-mtab -t aufs /dev/null "$dir"
force_umount --no-mtab "$dir"
yolo mount --no-mtab -t zfs /dev/null "$dir"
force_umount --no-mtab "$dir"

rm -rf "$dir" "$upper" "$lower" "$work"
trap - EXIT

export XDG_RUNTIME_DIR=$SNAP_COMMON/run
mkdir -p "$XDG_RUNTIME_DIR"
mkdir -p "$SNAP_COMMON/var-lib-docker"

run_dir="/run/snap.$SNAP_INSTANCE_NAME"
mkdir -p "$run_dir"

workaround_lp1606510
workaround_apparmor_profile_reload

data_root="$(snapctl get data-root 2>/dev/null || true)"
if [ -z "$data_root" ]; then
	data_root="$SNAP_COMMON/var-lib-docker"
fi

exec /snap/docker/current/bin/dockerd \
	--group "$default_socket_group" \
	--exec-root="$run_dir" \
	--data-root="$data_root" \
	--pidfile="$run_dir/docker.pid" \
	--config-file="$SNAP_DATA/config/daemon.json" \
	"$@"