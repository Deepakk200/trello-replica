'use client';

import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { Board } from '@/types';
import { ListColumn } from '@/components/list/list-column';
import { AddListButton } from './add-list-button';
import { BoardDndContext } from './dnd-context';

export function ListsRow({ board }: { board: Board }) {
  const visibleListIds = useBoardStore(
    useShallow((s) => board.listIds.filter((id) => !s.lists[id]?.isArchived)),
  );
  return (
    <BoardDndContext>
      <SortableContext items={visibleListIds} strategy={horizontalListSortingStrategy}>
        <div className="flex flex-row gap-3 items-start h-full pb-3">
          {visibleListIds.map((listId) => (
            <ListColumn key={listId} listId={listId} boardId={board.id} />
          ))}
          <AddListButton boardId={board.id} />
        </div>
      </SortableContext>
    </BoardDndContext>
  );
}
