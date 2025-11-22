import { Clock, HandCoins } from 'lucide-react'
interface DrawingSlotHeaderProps {
  drawing: {
    title: string;
    isPaid: boolean;
    price: number;
    endAt: string;
  };
  stats?: {
    available: number;
    total: number;
  };
}

function DrawingSlotHeader({ drawing, stats }: DrawingSlotHeaderProps) {
  // Calculate time remaining
  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}H`;
    }
    return `${hours}H`;
  };

  return (
    <div>
      <div className="flex flex-col gap-2 justify-center">
        {/* Title */}
        <h1 className="text-xl md:text-2xl font-bold line-clamp-2 dark:text-white">{drawing.title}</h1>
        <div className="flex items-center justify-between gap-6 ">

          {/* Prize Badge */}
          <div className="flex items-center gap-2 px-2 py-1 md:px-4 border-2 border-teal-500 rounded-lg bg-teal-50 dark:bg-teal-950">
            <HandCoins className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
              {drawing.isPaid ? (
                `$${drawing.price.toLocaleString()}`
              ) : 'Gratis'}
            </span>
          </div>

          {/* Time Remaining Badge */}
          <div className="flex items-center gap-2 px-2 py-1 md:px-4 border-2 border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-950">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
              {getTimeRemaining(drawing.endAt)}
            </span>
          </div>
        </div>
        {/* Available Slots */}
        {stats && (
          <div className="text-center mb-2">
            <div className="text-xl md:text-4xl font-bold text-teal-600 dark:text-teal-400">
              {stats.available} / {stats.total}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              disponibles
            </div>
          </div>
        )}
      </div>
      <div className="border-b border-gray-300 border-dashed mt-3 mb-4.5 dark:border-gray-700" />
    </div>
  );
}

export default DrawingSlotHeader;