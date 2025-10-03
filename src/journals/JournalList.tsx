
import type { TemperatureCheck, CleaningLog, EquipmentCheck } from '../data/types';
import { Table, type TableColumn } from '../components/Table';
import { formatDate } from '../utils/format';

type JournalEntry = TemperatureCheck | CleaningLog | EquipmentCheck;

interface JournalListProps {
  entries: JournalEntry[];
  type: 'temperature' | 'cleaning' | 'equipment';
  loading?: boolean;
}

export function JournalList({ entries, type, loading = false }: JournalListProps) {
  const getColumns = (): TableColumn<JournalEntry>[] => {
    const baseColumns: TableColumn<JournalEntry>[] = [
      {
        key: 'timestamp',
        label: 'Date & Time',
        sortable: true,
        render: (timestamp) => (
          <span className="text-sm">{formatDate(timestamp)}</span>
        ),
      },
      {
        key: 'userName',
        label: 'User',
        sortable: true,
        render: (userName) => (
          <span className="font-medium">{userName}</span>
        ),
      },
    ];

    switch (type) {
      case 'temperature':
        return [
          ...baseColumns,
          {
            key: 'location',
            label: 'Location',
            sortable: true,
            render: (location) => (
              <span className="font-medium">{location}</span>
            ),
          },
          {
            key: 'valueC',
            label: 'Temperature',
            sortable: true,
            render: (valueC) => {
              const temp = valueC as number;
              const isNormal = temp >= -5 && temp <= 8; // Example safe range
              return (
                <span className={`font-medium ${isNormal ? 'text-green-600' : 'text-red-400'}`}>
                  {temp}°C
                </span>
              );
            },
          },
          {
            key: 'notes',
            label: 'Notes',
            render: (notes) => (
              <span className="text-sm text-gray-600">{notes || '-'}</span>
            ),
          },
        ];

      case 'cleaning':
        return [
          ...baseColumns,
          {
            key: 'area',
            label: 'Area',
            sortable: true,
            render: (area) => (
              <span className="font-medium">{area}</span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (status) => {
              const isDone = status === 'done';
              return (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isDone ? 'bg-green-100 text-green-800' : 'bg-red-500/20 text-red-800'
                }`}>
                  {isDone ? 'Done' : 'Missed'}
                </span>
              );
            },
          },
          {
            key: 'notes',
            label: 'Notes',
            render: (notes) => (
              <span className="text-sm text-gray-600">{notes || '-'}</span>
            ),
          },
        ];

      case 'equipment':
        return [
          ...baseColumns,
          {
            key: 'equipment',
            label: 'Equipment',
            sortable: true,
            render: (equipment) => (
              <span className="font-medium">{equipment}</span>
            ),
          },
          {
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (status) => {
              const isOk = status === 'ok';
              return (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isOk ? 'bg-green-100 text-green-800' : 'bg-red-500/20 text-red-800'
                }`}>
                  {isOk ? 'OK' : 'Issue'}
                </span>
              );
            },
          },
          {
            key: 'notes',
            label: 'Notes',
            render: (notes) => (
              <span className="text-sm text-gray-600">{notes || '-'}</span>
            ),
          },
        ];

      default:
        return baseColumns;
    }
  };

  const getEmptyMessage = () => {
    switch (type) {
      case 'temperature':
        return 'No temperature checks recorded. Start logging to maintain compliance.';
      case 'cleaning':
        return 'No cleaning logs recorded. Start logging cleaning activities.';
      case 'equipment':
        return 'No equipment checks recorded. Start logging equipment maintenance.';
      default:
        return 'No entries found.';
    }
  };

  return (
    <Table
      data={entries}
      columns={getColumns()}
      keyExtractor={(entry) => entry.id}
      loading={loading}
      emptyMessage={getEmptyMessage()}
    />
  );
}
