export function RoomHeader({
  roomId,
  upper,
}: {
  roomId: string;
  upper: number;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="text-sm text-white/60">
        Room: <span className="text-white">{roomId}</span>
      </div>
      <div className="text-sm text-white/60">
        Upper limit: <span className="text-white">{upper}</span>
      </div>
    </div>
  );
}
