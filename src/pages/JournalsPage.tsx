import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Select } from '../components/Select';
import { JournalList } from '../journals/JournalList';
import { JournalForm } from '../journals/JournalForm';
import { useToast } from '../components/Toast';
import {
  listTemperatureChecks,
  listCleaningLogs,
  listEquipmentChecks,
  createTemperatureCheck,
  createCleaningLog,
  createEquipmentCheck,
} from '../data/store';

type JournalType = 'temperature' | 'cleaning' | 'equipment';
type ViewMode = 'list' | 'create';

export function JournalsPage() {
  const { showSuccess, showError } = useToast();
  
  const [selectedType, setSelectedType] = useState<JournalType>('temperature');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [selectedType]);

  const loadEntries = () => {
    setLoading(true);
    try {
      let data: any[] = [];
      switch (selectedType) {
        case 'temperature':
          data = listTemperatureChecks();
          break;
        case 'cleaning':
          data = listCleaningLogs();
          break;
        case 'equipment':
          data = listEquipmentChecks();
          break;
      }
      setEntries(data);
    } catch (error) {
      showError('Failed to load journal entries');
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData: any) => {
    setSubmitting(true);
    try {
      let newEntry: any;
      switch (selectedType) {
        case 'temperature':
          newEntry = createTemperatureCheck(formData);
          break;
        case 'cleaning':
          newEntry = createCleaningLog(formData);
          break;
        case 'equipment':
          newEntry = createEquipmentCheck(formData);
          break;
      }
      
      setEntries(prev => [newEntry, ...prev]);
      setViewMode('list');
      showSuccess(`${getTypeLabel()} logged successfully`);
    } catch (error) {
      showError(`Failed to log ${getTypeLabel().toLowerCase()}`);
      console.error('Error creating journal entry:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
  };

  const getTypeLabel = () => {
    switch (selectedType) {
      case 'temperature':
        return 'Temperature Check';
      case 'cleaning':
        return 'Cleaning Log';
      case 'equipment':
        return 'Equipment Check';
      default:
        return 'Journal Entry';
    }
  };

  const typeOptions = [
    { value: 'temperature', label: 'Temperature Checks' },
    { value: 'cleaning', label: 'Cleaning Logs' },
    { value: 'equipment', label: 'Equipment Checks' },
  ];

  const renderHeader = () => {
    switch (viewMode) {
      case 'create':
        return `Log ${getTypeLabel()}`;
      default:
        return 'Journals & Compliance';
    }
  };

  const renderHeaderActions = () => {
    if (viewMode === 'list') {
      return (
        <button
          onClick={() => setViewMode('create')}
          className="btn-primary btn-md"
        >
          Log {getTypeLabel()}
        </button>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{renderHeader()}</CardTitle>
            {renderHeaderActions()}
          </div>
        </CardHeader>
        
        <CardContent>
          {viewMode === 'list' && (
            <>
              <div className="mb-6">
                <label className="form-label">Journal Type</label>
                <Select
                  value={selectedType}
                  onChange={(value: string) => setSelectedType(value as JournalType)}
                  options={typeOptions}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 text-sm text-blue-700">
                    <p className="font-medium">Journals Feature (Beta)</p>
                    <p>
                      Basic logging functionality. Future versions will include scheduled checks, assignments, photo uploads, and automated compliance reporting.
                    </p>
                  </div>
                </div>
              </div>

              <JournalList
                entries={entries}
                type={selectedType}
                loading={loading}
              />
            </>
          )}

          {viewMode === 'create' && (
            <JournalForm
              type={selectedType}
              onSubmit={handleCreate}
              onCancel={handleCancel}
              isSubmitting={submitting}
            />
          )}
        </CardContent>
      </Card>

      {/* Summary stats */}
      {viewMode === 'list' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {entries.length}
              </div>
              <div className="text-sm text-gray-600">Total Entries</div>
            </div>
          </Card>

          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {entries.filter(entry => {
                  if (selectedType === 'temperature') return true; // All temp checks are valid
                  return entry.status === 'done' || entry.status === 'ok';
                }).length}
              </div>
              <div className="text-sm text-gray-600">Compliant</div>
            </div>
          </Card>

          <Card padding="md">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {entries.filter(entry => {
                  if (selectedType === 'temperature') return false; // No temp issues in basic implementation
                  return entry.status === 'missed' || entry.status === 'issue';
                }).length}
              </div>
              <div className="text-sm text-gray-600">Issues</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
