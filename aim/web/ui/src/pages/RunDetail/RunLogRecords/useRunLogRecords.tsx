import React from 'react';
import moment from 'moment';
import _ from 'lodash-es';

import { IResourceState } from 'modules/core/utils/createResource';

import {
  TIMELINE_DAY_FORMAT,
  TIMELINE_MONTH_FORMAT,
  TIMELINE_TIME_FORMAT,
} from 'config/dates/dates';

import { LogsLastRequestEnum } from '../RunLogsTab';

import runRecordsEngine from './RunLogRecordsStore';
import { ListItemEnum } from './LogRecordItem/config';

import { MessagesItemType, RunLogRecordType } from '.';

function useRunLogRecords(runId: string) {
  const [data, setData] = React.useState<RunLogRecordType[]>([]);
  const [lastAddedMonth, setLastAddedMonth] = React.useState<string>('');
  const [lastAddedDay, setLastAddedDay] = React.useState<string>('');
  const [lastRequestType, setLastRequestType] =
    React.useState<LogsLastRequestEnum>(LogsLastRequestEnum.DEFAULT);
  const { current: engine } = React.useRef(runRecordsEngine);
  const runLogRecordsState: IResourceState<{
    runLogRecordsList: RunLogRecordType[];
    runLogRecordsTotalCount: number;
  }> = engine.runLogRecordsState((state) => state);

  React.useEffect(() => {
    if (_.isEmpty(runLogRecordsState.data?.runLogRecordsList)) {
      engine.fetchRunLogRecords({ runId, record_range: ':1000' });
    }
    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (runLogRecordsState.data?.runLogRecordsList?.length) {
      let newData = [...data, ...runLogRecordsState.data.runLogRecordsList];
      setData(newData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runLogRecordsState.data]);

  const memoizedData = React.useMemo(() => {
    const messagesList: MessagesItemType[] = [];
    let currentMonth = lastAddedMonth;
    let currentDay = lastAddedDay;
    if (data.length) {
      data?.forEach((record: RunLogRecordType) => {
        const month = moment(record.timestamp * 1000).format(
          TIMELINE_MONTH_FORMAT,
        );
        if (month !== currentMonth) {
          messagesList.push({
            date: month,
            itemType: ListItemEnum.MONTH,
            height: 28,
          });
          currentMonth = month;
        }

        const day = moment(record.timestamp * 1000).format(TIMELINE_DAY_FORMAT);
        if (day !== currentDay) {
          messagesList.push({
            date: day,
            itemType: ListItemEnum.DAY,
            height: 28,
          });
          currentDay = day;
        }
        const feedItem = {
          date: moment(record.timestamp * 1000).format(TIMELINE_TIME_FORMAT),
          hash: record.hash,
          message: record.message,
          type: record.log_level,
          creation_time: record.timestamp,
          extraParams: record.args,
          runId,
          itemType: ListItemEnum.RECORD,
          height: 20,
        };
        messagesList.push(feedItem);
      });
    }
    setLastAddedMonth(currentMonth);
    setLastAddedDay(currentDay);
    return messagesList;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, runId]);

  function loadMore(): void {
    if (runLogRecordsState.data && !runLogRecordsState.loading) {
      setLastRequestType(LogsLastRequestEnum.LOAD_MORE);
      engine.fetchRunLogRecords({ runId, record_range: '' });
    }
  }

  return {
    isLoading: runLogRecordsState.loading,
    data: memoizedData,
    totalRunLogRecordCount: runLogRecordsState.data?.runLogRecordsTotalCount,
    fetchedCount: data.length,
    lastRequestType,
    loadMore,
  };
}

export default useRunLogRecords;
