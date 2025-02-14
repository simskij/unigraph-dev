/* eslint-disable react/require-default-props */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-param-reassign */
import { Typography, colors, IconButton } from '@mui/material';
import { styled } from '@mui/styles';
import React from 'react';
import _ from 'lodash';
import { findAllUids, getCircularReplacer, UnigraphObject } from 'unigraph-dev-common/lib/utils/utils';
import { MoreVert } from '@mui/icons-material';
import stringify from 'json-stable-stringify';
import { mdiClockOutline, mdiNoteOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import Sugar from 'sugar';
import { AppState } from 'unigraph-dev-common/lib/types/unigraph';
import { AutoDynamicView } from '../../components/ObjectView/AutoDynamicView';
import { ViewViewDetailed } from '../../components/ObjectView/DefaultObjectView';

import { copyChildToClipboard, touchTree } from './commands';
import { onUnigraphContextMenu } from '../../components/ObjectView/DefaultObjectContextMenu';
import { noteQuery, noteQueryDetailed } from './noteQuery';
import { getParentsAndReferences } from '../../components/ObjectView/backlinksUtils';
import { DynamicObjectListView } from '../../components/ObjectView/DynamicObjectListView';
import { setClipboardHandler } from '../../clipboardUtils';
import { getCallbacks, getSubentities, getShortcuts, noteBlockCommands } from './utils';
import { PlaceholderNoteBlock } from './NoteBlockViews';
import { useNoteEditor } from './NoteEditor';
import todoItemPlugin from './contrib/todoItem';
import { useSubscriptionDelegate } from '../../components/ObjectView/AutoDynamicView/SubscriptionDelegate';
import { HistoryState } from './history';
import { Outline, OutlineContentContext } from './Outline';
import { UnigraphObject as PlainUnigraphObject } from './types';
import { useOutlineCollapsed } from './useOutlineCollapsed';
import {
    DataContext,
    DataContextWrapper,
    removeAllPropsFromObj,
    scrollIntoViewIfNeeded,
    TabContext,
} from '../../utils';
import { Markdown } from '../semantic/Markdown';

const childrenComponents = {
    '$/schema/note_block': {
        view: DetailedNoteBlock,
        query: noteQuery,
    },
    '$/schema/view': {
        view: ViewViewDetailed,
    },
    '$/schema/embed_block': {
        view: DetailedEmbedBlock,
        query: noteQuery,
        options: {
            ignoreBacklinks: true,
        },
    },
};

const BlockChild = ({ elindex, shortcuts, displayAs, callbacks, el }: any) => (
    <AutoDynamicView
        options={{
            noDrag: true,
            noContextMenu: true,
            compact: true,
            allowSubentity: true,
            customBoundingBox: true,
            noClickthrough: true,
            expandedChildren: true,
            noSubentities: ['$/schema/note_block', '$/schema/embed_block'].includes(el.type?.['unigraph.id']),
            noBacklinks: ['$/schema/note_block', '$/schema/embed_block'].includes(el.type?.['unigraph.id']),
            shouldGetBacklinks: !['$/schema/embed_block'].includes(el.type?.['unigraph.id']),
        }}
        object={el}
        index={elindex}
        shortcuts={shortcuts}
        callbacks={callbacks}
        components={childrenComponents}
        attributes={{
            isChildren: true,
            displayAs,
        }}
    />
);

const BlockChildren = ({
    isChildren,
    subentities,
    tabContext,
    data,
    editorContext,
    displayAs,
    childrenDisplayAs,
    callbacks,
    copyOrCutHandler,
}: any) => {
    const addNoteBlock = React.useCallback(() => {
        noteBlockCommands['add-child'](data, editorContext);
    }, [data, editorContext]);

    return (
        <div style={{ width: '100%' }}>
            {subentities.length || isChildren
                ? // <DragandDrop
                  //     dndContext={tabContext.viewId}
                  //     listId={data?.uid}
                  //     arrayId={data?._value?.children?.uid}
                  //     style={dropIndicatorStyles}
                  //     transformOnDrop={(props: any) => {
                  //         return {
                  //             ...props,
                  //             uid: undefined,
                  //             data: {
                  //                 type: { 'unigraph.id': '$/schema/embed_block' },
                  //                 _value: {
                  //                     content: { uid: props.uid },
                  //                 },
                  //             },
                  //         };
                  //     }}
                  // >
                  (subentities as PlainUnigraphObject[]).map((entity, index) => {
                      if (!entity?.uid) return undefined;
                      const { uid } = entity;
                      return (
                          <Outline
                              key={uid}
                              noteBlock={entity}
                              parentNoteBlock={data}
                              index={index}
                              editorContext={editorContext}
                              // createBelow={() => {
                              //     addChild(data, editorContext, elindex);
                              // }}
                              displayAs={childrenDisplayAs}
                              parentDisplayAs={displayAs}
                              showCollapse={getSubentities(entity)[0].length >= 1}
                          >
                              <BlockChild
                                  el={entity}
                                  elindex={index}
                                  editorContext={editorContext}
                                  callbacks={getCallbacks(callbacks, data, editorContext, index)}
                                  shortcuts={getShortcuts(data, editorContext, index, copyOrCutHandler, callbacks)}
                                  displayAs={childrenDisplayAs}
                              />
                          </Outline>
                      );
                  })
                : // </DragandDrop>
                  data && (
                      <Outline
                          noteBlock={data}
                          index={0}
                          editorContext={editorContext}
                          displayAs={data?._value?.children?._displayAs || 'outliner'}
                          parentDisplayAs={displayAs}
                      >
                          <PlaceholderNoteBlock onClick={addNoteBlock} />
                      </Outline>
                  )}
        </div>
    );
};

export function ParentsAndReferences({ data }: any) {
    const [parents, setParents] = React.useState([]);
    const [references, setReferences] = React.useState([]);

    React.useEffect(() => {
        const [newPar, newRef]: any = getParentsAndReferences(
            data['~_value'],
            (data['unigraph.origin'] || []).filter((el: any) => el?.uid !== data?.uid),
        );
        if (
            stringify(parents, { replacer: getCircularReplacer() }) !==
            stringify(newPar, { replacer: getCircularReplacer() })
        )
            setParents(newPar);
        if (
            stringify(references, { replacer: getCircularReplacer() }) !==
            stringify(newRef, { replacer: getCircularReplacer() })
        )
            setReferences(newRef);
    }, [data]);

    return (
        <div style={{ marginTop: '36px' }}>
            {parents.length > 0 ? (
                <DynamicObjectListView
                    inline
                    items={parents.map((el: any) => ({ ...el, _stub: true }))}
                    context={data}
                    callbacks={{ references }}
                    compact
                    noDrop
                    titleBar=" parents"
                    loadAll
                    noHoverHighlight
                    components={{
                        '$/schema/note_block': {
                            view: NoChildrenReferenceNoteView,
                            query: noteQueryDetailed,
                            options: {
                                noClickthrough: true,
                                noSubentities: true,
                                noContextMenu: true,
                                noBacklinks: true,
                            },
                        },
                    }}
                />
            ) : undefined}
            <DynamicObjectListView
                inline
                items={references.map((el: any) => ({ ...el, _stub: true }))}
                context={data}
                compact
                noDrop
                titleBar=" linked references"
                callbacks={{ references }}
                viewOptions={{
                    style: {
                        padding: '12px',
                        border: '1px solid lightgray',
                        borderRadius: '8px',
                    },
                }}
                loadAll
                noHoverHighlight
                noRemover
                itemRemover={(uids) =>
                    window.unigraph.updateTriplets(
                        uids.map((el) => `<${data.uid}> <unigraph.origin> <${el}> .`),
                        true,
                    )
                }
                components={{
                    '$/schema/note_block': {
                        view: ReferenceNoteView,
                        query: noteQueryDetailed,
                        options: {
                            noClickthrough: true,
                            noSubentities: true,
                            noContextMenu: true,
                            noBacklinks: true,
                        },
                    },
                }}
            />
        </div>
    );
}

function NoteViewPageWrapper({ children, isRoot }: any) {
    return !isRoot ? (
        children
    ) : (
        <div style={{ height: '100%', width: '100%', padding: '1rem 2rem', overflow: 'auto' }}>{children}</div>
    );
}

/** Renders both page title and content of each note block. */
function NoteViewTextWrapper({
    children,
    semanticChildren,
    isRoot,
    isEditing,
    onContextMenu,
    noText,
    callbacks,
}: {
    children: React.ReactNode;
    semanticChildren: React.ReactNode;
    isRoot: boolean;
    isEditing: boolean;
    noText?: any;
    onContextMenu: React.MouseEventHandler;
    callbacks: any;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                ...(noText ? { position: 'absolute', opacity: 0, pointerEvents: 'none' } : {}),
            }}
            onContextMenu={isRoot || isEditing ? undefined : onContextMenu}
        >
            {children}
            {semanticChildren}
            {isRoot && (
                <IconButton onClick={onContextMenu} style={{ marginLeft: '8px' }} aria-label="more" size="small">
                    <MoreVert fontSize="small" />
                </IconButton>
            )}
            {callbacks.BacklinkComponent}
        </div>
    );
}

const DateContainer = styled('div')({
    marginTop: '4px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    color: colors.grey[500],
    fontSize: '0.9rem',
});

const ChildrenIndicator = React.memo(function ChildrenIndicator({
    count,
    onClick,
}: {
    count: number;
    onClick?: React.MouseEventHandler;
}) {
    return (
        <Typography
            style={{
                position: 'absolute',
                top: 0,
                left: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0.125rem',
                color: colors.grey[500],
                wordBreak: 'keep-all',
                fontSize: '0.8rem',
                cursor: 'pointer',
            }}
            title={`Show ${count} children`}
            onClick={onClick}
        >
            ({count})
        </Typography>
    );
});

export function DetailedOutlinerBlock({
    data,
    noText,
    isChildren,
    noReferences,
    callbacks,
    focused,
    index,
    componentId,
    displayAs,
    noteEditorProps,
    onFocus,
    onClick,
    onKeyDown,
    editorFrameStyle,
    beforeEditor,
    customView,
    pullText,
    pushText,
    locateInlineChildren,
    editorSubsId,
}: any) {
    const tabContext = React.useContext(TabContext);
    // eslint-disable-next-line no-bitwise
    isChildren |= callbacks?.isChildren;
    const [subentities, otherChildren] = getSubentities(data);
    const [command, setCommand] = React.useState<() => any | undefined>();
    const editorRef = React.useRef<any>();
    const edited = React.useRef(false);
    const [isEditing, setIsEditing] = React.useState(
        noteEditorProps ? window.unigraph.getState('global/focused').value?.uid === data.uid : false,
    );
    const [isCollapsed, toggleCollapsed] = useOutlineCollapsed(data.uid);
    const nodesState = window.unigraph.addState(`${tabContext.viewId}${callbacks.subsId}/nodes`, []);
    const historyState: AppState<HistoryState> = window.unigraph.addState(
        `${tabContext.viewId}${callbacks.subsId}/history`,
        {
            history: [],
            future: [],
        },
    );
    const editorContext = {
        edited: noteEditorProps ? edited : undefined,
        setCommand,
        callbacks,
        nodesState,
        historyState,
    };

    const resetEdited = () => {
        edited.current = false;
        setTimeout(() => {
            commandFn();
        });
    };

    const [NoteEditorInner, setCurrentText, getCurrentText, onBlur, textInput] =
        (pullText &&
            pushText &&
            noteEditorProps?.(
                pullText,
                pushText,
                locateInlineChildren || ((dd: any) => dd),
                isEditing,
                setIsEditing,
                edited,
                focused,
                data,
                callbacks,
                componentId,
                editorContext,
                resetEdited,
                setCommand,
                editorSubsId,
            )) ||
        [];

    const onBlurHandler = React.useCallback(() => {
        // setIsEditing(false);
        // inputDebounced.current.flush();
        if (onBlur) onBlur();
        if (focused && window.unigraph.getState('global/focused').value.component === componentId) {
            window.unigraph.getState('global/focused').setValue({ uid: '', caret: 0, type: '' });
        }
    }, [focused]);

    const commandFn = () => {
        if (edited.current !== true && command) {
            command();
            setCommand(undefined);
        }
    };

    React.useEffect(() => {
        if (callbacks?.registerBoundingBox) {
            callbacks.registerBoundingBox(editorRef.current);
        }
    }, []);

    /** `subentities` may contain `undefined` for unknown reasons. */
    const validSubentities = subentities.filter((s: any) => s && s.uid && s.type);

    React.useEffect(() => {
        const newNodes = _.unionBy(
            [
                {
                    uid: data.uid,
                    componentId,
                    children: isCollapsed ? [] : validSubentities.map((el: any) => el.uid),
                    type: data?.type?.['unigraph.id'],
                    root: !isChildren,
                },
                ...validSubentities
                    .filter(
                        (el: any) =>
                            !['$/schema/note_block', '$/schema/embed_block'].includes(el.type?.['unigraph.id']),
                    )
                    .map((el: any) => {
                        const [subs] = getSubentities(el);
                        return {
                            uid: el.uid,
                            children: subs.map((ell: any) => ell.uid),
                            type: el?.type?.['unigraph.id'],
                            root: false,
                        };
                    }),
            ],
            nodesState.value,
            'uid',
        );
        nodesState.setValue(newNodes);
    }, [
        JSON.stringify(validSubentities.map((el: any) => el?.uid).sort()),
        data.uid,
        componentId,
        isCollapsed,
        nodesState,
    ]);

    React.useEffect(() => {
        if (focused && onFocus) {
            onFocus(isEditing, setIsEditing, getCurrentText, textInput, edited, editorRef, editorContext);
        }
    }, [focused]);

    React.useEffect(() => {
        if (focused && textInput?.current) {
            scrollIntoViewIfNeeded(textInput.current);
        }
    }, [data.uid, index, focused]);

    const copyOrCutHandler = React.useCallback(
        (ev, elindex, isCut) => {
            if (window.unigraph.getState('global/selected').value.length > 0) {
                ev.preventDefault();
                const clipboardData = copyChildToClipboard(data, editorContext, elindex, isCut);
                window.unigraph
                    .getState('temp/clipboardItems')
                    .setValue((val: any) => (Array.isArray(val) ? [...val, clipboardData] : [clipboardData]));
                return setClipboardHandler;
            }
            return false;
        },
        [data, editorContext, componentId],
    );

    React.useEffect(commandFn, [command]);

    const childrenDisplayAs = data?._value?.children?._displayAs || 'outliner';

    const rOutlineContentEl = React.useContext(OutlineContentContext);
    const combinedRef = React.useCallback(
        (node: HTMLDivElement) => {
            rOutlineContentEl.current = node;
            editorRef.current = node;
        },
        [rOutlineContentEl],
    );

    const onContextMenu = React.useCallback(
        (event: React.MouseEvent) => {
            onUnigraphContextMenu(event, data, undefined, { ...callbacks, componentId });
        },
        [callbacks, componentId, data],
    );

    const onClickChildrenIndicator = React.useCallback(
        (ev: React.MouseEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (isCollapsed) toggleCollapsed();
        },
        [isCollapsed, toggleCollapsed],
    );

    return (
        <NoteViewPageWrapper isRoot={!isChildren}>
            <div
                style={{
                    width: '100%',
                    ...(!isChildren ? { overflow: 'visible' } : {}),
                }}
            >
                <NoteViewTextWrapper
                    isRoot={!isChildren}
                    noText={noText}
                    isEditing={isEditing}
                    onContextMenu={onContextMenu}
                    callbacks={callbacks}
                    semanticChildren={otherChildren
                        .filter((el: any) => el?.type)
                        .map((el: any) => (
                            <AutoDynamicView
                                object={
                                    ['$/schema/note_block', '$/schema/embed_block'].includes(el.type?.['unigraph.id'])
                                        ? el
                                        : { uid: el.uid, type: el.type }
                                }
                                options={{ inline: true }}
                            />
                        ))}
                >
                    <div
                        key="editor-frame"
                        ref={combinedRef}
                        tabIndex={textInput?.current ? undefined : -1}
                        onClick={(ev) => {
                            if (textInput?.current && !isEditing) {
                                setIsEditing(true);
                            }
                            return onClick(
                                ev,
                                isEditing,
                                setIsEditing,
                                getCurrentText,
                                textInput,
                                edited,
                                editorRef,
                                editorContext,
                            );
                        }}
                        onBlur={onBlurHandler}
                        onKeyDown={(ev) =>
                            onKeyDown?.(
                                ev,
                                isEditing,
                                setIsEditing,
                                getCurrentText,
                                textInput,
                                edited,
                                editorRef,
                                editorContext,
                            )
                        }
                        style={{
                            width: '100%',
                            display: 'flex',
                            cursor: 'text',
                            ...(editorFrameStyle || {}),
                        }}
                    >
                        {beforeEditor}
                        {customView(
                            isEditing,
                            setIsEditing,
                            getCurrentText,
                            textInput,
                            edited,
                            editorRef,
                            editorContext,
                        )}
                        {NoteEditorInner}
                        {!isEditing && isCollapsed && (
                            <ChildrenIndicator count={subentities.length} onClick={onClickChildrenIndicator} />
                        )}
                    </div>
                </NoteViewTextWrapper>
                {!isChildren && !callbacks.isEmbed && (
                    <DateContainer>
                        <Icon
                            path={mdiClockOutline}
                            size={0.75}
                            style={{ marginRight: '0.25rem', transform: 'translateY(-0.08rem)' }}
                        />
                        <span>{`${Sugar.Date(data._updatedAt || 0).long()} (${Sugar.Date.relative(
                            new Date(data._updatedAt || 0),
                        )})`}</span>
                    </DateContainer>
                )}
                {!isCollapsed && (
                    <BlockChildren
                        isChildren={isChildren}
                        subentities={subentities}
                        tabContext={tabContext}
                        data={data}
                        editorContext={editorContext}
                        displayAs={displayAs}
                        childrenDisplayAs={childrenDisplayAs}
                        callbacks={callbacks}
                        copyOrCutHandler={copyOrCutHandler}
                    />
                )}
                {!isChildren && !noReferences ? <ParentsAndReferences data={data} /> : []}
            </div>
        </NoteViewPageWrapper>
    );
}

export function DetailedNoteBlock({
    data,
    isChildren,
    noReferences,
    noText,
    callbacks,
    options,
    focused,
    index,
    componentId,
    displayAs,
}: any) {
    const dataRef = React.useRef<any>(data);
    dataRef.current = data;

    const onClickHandler = React.useCallback(
        (
            ev,
            isEditing: any,
            setIsEditing: any,
            getCurrentText: any,
            textInput: any,
            edited: any,
            editorRef: any,
            editorContext: any,
        ) => {
            const caretPos = Number((ev.target as HTMLElement).getAttribute('markdownPos') || -1);
            (ev.target as HTMLElement).removeAttribute('markdownPos');
            const finalCaretPos = caretPos === -1 ? getCurrentText().length : caretPos;
            window.unigraph.getState('global/focused').setValue({
                uid: data?.uid,
                caret: finalCaretPos,
                type: '$/schema/note_block',
                component: componentId,
            });
        },
        [componentId, data?.uid],
    );

    const customView = React.useCallback(
        (
            isEditing: any,
            setIsEditing: any,
            getCurrentText: any,
            textInput: any,
            edited: any,
            editorRef: any,
            editorContext: any,
        ) => (
            <AutoDynamicView
                object={
                    edited.current
                        ? { ...data.get('text')?._value?._value, '_value.%': getCurrentText() }
                        : data.get('text')?._value?._value
                }
                attributes={{
                    isHeading: !(isChildren || callbacks.isEmbed),
                }}
                style={isEditing ? { display: 'none' } : undefined}
                options={{ inline: true, noDrag: true, noContextMenu: true, noClickthrough: true }}
                callbacks={{
                    'get-semantic-properties': () => dataRef.current,
                }}
            />
        ),
        [data.get('text')?._value?._value?.['_value.%'], isChildren, callbacks.isEmbed],
    );

    return (
        <DetailedOutlinerBlock
            data={data}
            isChildren={isChildren}
            noReferences={noReferences}
            noText={noText}
            callbacks={callbacks}
            options={options}
            focused={focused}
            index={index}
            componentId={componentId}
            displayAs={displayAs}
            pullText={(uid: boolean) =>
                new UnigraphObject(data).get('text')?.as('primitiveRef')?.[uid ? 'uid' : '_value.%']
            }
            pushText={(text: string, __: any, editorContext: any) => {
                window.unigraph.touch(touchTree(editorContext.nodesState.value, data?.uid));
                return data._hide
                    ? window.unigraph.updateObject(
                          new UnigraphObject(data).get('text')._value._value.uid,
                          {
                              '_value.%': text,
                          },
                          false,
                          false,
                          callbacks.subsId,
                          [],
                      )
                    : window.unigraph.runExecutable('$/executable/rename-entity', {
                          uid: data.uid,
                          newName: text,
                          subIds: callbacks.subsId,
                      });
            }}
            noteEditorProps={useNoteEditor}
            onFocus={(
                isEditing: any,
                setIsEditing: any,
                getCurrentText: any,
                textInput: any,
                edited: any,
                editorRef: any,
                editorContext: any,
            ) => {
                window.unigraph.getState('global/focused/actions').setValue({
                    splitChild: () => {
                        // const sel = document.getSelection();
                        // const caret = _.min([sel?.anchorOffset, sel?.focusOffset]) as number;
                        callbacks['split-child'](getCurrentText(), textInput.current.selectionStart);
                    },
                    indentChild: callbacks['indent-child'],
                    unindentChild: callbacks['unindent-child-in-parent'],
                    convertChildToTodo: () => callbacks['convert-child-to-todo']?.(getCurrentText()),
                });
            }}
            onClick={onClickHandler}
            beforeEditor={
                isChildren && data._hide !== true ? (
                    <div
                        style={{ display: 'contents' }}
                        onClick={() => {
                            window.wsnavigator(`/library/object?uid=${data.uid}&type=${data?.type?.['unigraph.id']}`);
                        }}
                    >
                        <Icon path={mdiNoteOutline} size={0.8} style={{ opacity: 0.54, marginRight: '4px' }} />
                    </div>
                ) : (
                    []
                )
            }
            customView={customView}
        />
    );
}

export function DetailedEmbedBlock({ data, isChildren, callbacks, focused, index, componentId, displayAs }: any) {
    const onClickHandler = React.useCallback(
        (ev, isEditing, setIsEditing, getCurrentText, textInput) => {
            console.log(ev.target);
            const caretPos = Number((ev.target as HTMLElement).getAttribute('markdownPos') || -1);
            (ev.target as HTMLElement).removeAttribute('markdownPos');
            const finalCaretPos = caretPos === -1 ? getCurrentText?.()?.length : caretPos;
            window.unigraph.getState('global/focused').setValue({
                ...window.unigraph.getState('global/focused').value,
                uid: data?.uid,
                type: '$/schema/embed_block',
                component: componentId,
                caret: finalCaretPos,
            });
        },
        [componentId, data?.uid],
    );

    const [getObject, subsId] = useSubscriptionDelegate(
        data.get('content')?._value?.uid,
        data.get('content')?._value?.type?.['unigraph.id'],
        window.unigraph.getState('registry/dynamicView').value?.[data.get('content')?._value?.type?.['unigraph.id']],
        data.get('content')?._value,
    );

    const editor: any = {};
    if (data.get('content')?._value?.type?.['unigraph.id'] === '$/schema/todo') {
        editor.hook = useNoteEditor;
        editor.pullText = todoItemPlugin.pullText.bind(null, getObject());
        editor.pushText = todoItemPlugin.pushText.bind(null, subsId, getObject());
    }

    const [BacklinkComponent, setBacklinkComponent] = React.useState<any>(null);

    const onKeyDownHandler = React.useCallback(
        (
            ev: React.KeyboardEvent,
            isEditing: boolean,
            setIsEditing: React.Dispatch<React.SetStateAction<boolean>>,
            getCurrentText: any,
            textInput: any,
            edited: React.MutableRefObject<boolean>,
            editorRef: any,
            editorContext: any,
        ) => {
            const sel = document.getSelection();
            const caret = _.min([sel?.anchorOffset, sel?.focusOffset]) as number;
            switch (ev.key) {
                case 'Enter': // enter
                    if (!ev.shiftKey && !ev.ctrlKey && !ev.metaKey) {
                        ev.preventDefault();
                        callbacks['add-child']();
                    } else if (ev.ctrlKey || ev.metaKey) {
                        ev.preventDefault();
                    }
                    break;
                case 'Backspace': // backspace
                    // console.log(caret, document.getSelection()?.type)
                    callbacks['delete-child']();
                    break;
                case 'Tab': // tab
                    ev.preventDefault();
                    ev.stopPropagation();
                    // inputDebounced.current.flush();
                    if (ev.shiftKey) {
                        callbacks['unindent-child-in-parent']?.();
                    } else {
                        callbacks['indent-child']?.();
                    }
                    break;
                case 'ArrowLeft': // left arrow
                case 'ArrowUp': // up arrow
                    ev.preventDefault();
                    // inputDebounced.current.flush();
                    callbacks['focus-last-dfs-node'](data, editorContext, true, -1);
                    break;
                case 'ArrowRight': // right arrow
                case 'ArrowDown': // down arrow
                    ev.preventDefault();
                    // inputDebounced.current.flush();
                    callbacks['focus-next-dfs-node'](data, editorContext, false, 0);
                    break;
                default:
                    // console.log(ev);
                    break;
            }
        },
        [callbacks, componentId, data],
    );

    const customView = React.useCallback(
        (
            isEditing: any,
            setIsEditing: any,
            getCurrentText: any,
            textInput: any,
            edited: any,
            editorRef: any,
            editorContext: any,
        ) =>
            isEditing && !editor.hook ? undefined : (
                <AutoDynamicView
                    object={getObject()}
                    components={{
                        '$/schema/view': { view: ViewViewDetailed },
                    }}
                    attributes={{
                        isHeading: !(isChildren || callbacks.isEmbed),
                    }}
                    options={{
                        inline: true,
                        noDrag: true,
                        noDrop: true,
                        noClickthrough: true,
                        shouldGetBacklinks: true,
                        noBacklinks: true,
                    }}
                    callbacks={{
                        'get-semantic-properties': () => data,
                        isEmbed: true,
                        subsId,
                        isEditing,
                    }}
                    setBacklinkComponent={setBacklinkComponent}
                />
            ),
        [data, isChildren, callbacks.isEmbed, getObject, BacklinkComponent],
    );

    return (
        <DetailedOutlinerBlock
            data={data}
            isChildren={isChildren}
            callbacks={{ ...callbacks, BacklinkComponent }}
            focused={focused}
            index={index}
            componentId={componentId}
            displayAs={displayAs}
            noteEditorProps={editor.hook}
            pullText={editor.pullText}
            pushText={editor.pushText}
            editorSubsId={subsId}
            locateInlineChildren={(dd: any) => dd?._value?.content?._value}
            onFocus={(
                isEditing: any,
                setIsEditing: any,
                getCurrentText: any,
                textInput: any,
                edited: any,
                editorRef: any,
                editorContext: any,
            ) => {
                if (!editor.hook) editorRef.current.focus();
                window.unigraph.getState('global/focused/actions').setValue({
                    splitChild: () => {
                        callbacks['add-child']();
                    },
                    indentChild: callbacks['indent-child'],
                    unindentChild: callbacks['unindent-child-in-parent'],
                    convertChildToTodo: () => callbacks['convert-child-to-todo']?.(getCurrentText()),
                });
            }}
            onClick={onClickHandler}
            onKeyDown={editor.hook ? undefined : onKeyDownHandler}
            editorFrameStyle={
                focused
                    ? {
                          border: '1px solid #00bfff',
                          margin: '-1px',
                          outline: 'none',
                          borderRadius: '4px',
                      }
                    : { outline: 'none' }
            }
            customView={customView}
        />
    );
}

export const ReferenceNoteView = ({ data, callbacks, noChildren, componentId }: any) => {
    const [subentities, otherChildren] = getSubentities(data);
    const dataContext = React.useContext(DataContext);

    const [pathNames, setPathNames] = React.useState<any[]>([]);
    const [refObjects, setRefObjects] = React.useState([{}]);
    const [nestedReferences, setNestedReferences] = React.useState<boolean[]>([]);

    React.useEffect(() => {
        removeAllPropsFromObj(data, ['~_value', '~unigraph.origin', 'unigraph.origin']);
        const targetObj = data;
        const paths: any[] = findAllUids(data, callbacks?.context?.uid).map((el) => el[1]);
        console.log(paths);
        const refinedPaths = paths
            .filter(
                (path) =>
                    path.filter(
                        (el: any, index: number) =>
                            el._key &&
                            path[index + 1]?.type?.['unigraph.id'] === '$/schema/interface/semantic' &&
                            path[index + 1]?._value.uid !== callbacks?.context?.uid,
                    ).length === 0,
            )
            .filter(
                (path) =>
                    path.filter(
                        (el: any, index: number) =>
                            el.type?.['unigraph.id'] === '$/schema/embed_block' &&
                            el?._value?.children?.uid &&
                            path[index + 2].uid === el._value.children.uid,
                    ).length === 0,
            )
            .filter(
                (path) =>
                    !(
                        path.length === 6 &&
                        path[5]?.uid === callbacks?.context?.uid &&
                        path[5]?.type?.['unigraph.id'] === '$/schema/tag'
                    ),
            )
            .map((path) =>
                path.filter(
                    (el: any) =>
                        el?.['dgraph.type']?.includes('Entity') ||
                        el.uid === callbacks?.context?.uid ||
                        (el?.type?.['unigraph.id']?.startsWith('$/schema/') &&
                            !['$/schema/subentity', '$/schema/interface/semantic'].includes(el?.type?.['unigraph.id'])),
                ),
            );
        const nRef = refinedPaths.map((path) => {
            let idx = false;
            path.slice(1).forEach((obj: any, index: any) => {
                if (
                    idx === false &&
                    callbacks.references.map((el: any) => el.uid).includes(obj.uid) &&
                    ['$/schema/note_block', '$/schema/embed_block'].includes(obj.type?.['unigraph.id'])
                )
                    idx = index + 1;
            });
            return idx;
        });
        setNestedReferences(nRef);

        setRefObjects(refinedPaths.map((refinedPath) => refinedPath[refinedPath.length - 2]));
        setPathNames(
            refinedPaths.map((refinedPath: any, index) => {
                const textPaths = refinedPath.map((el: any) => [
                    new UnigraphObject(el)?.get('text')?._value?._value,
                    el,
                ]);
                if (nRef[index] === false) {
                    return textPaths
                        .filter((el: any) => el[0] !== undefined)
                        .slice(0, noChildren ? undefined : -1)
                        .slice(1);
                }
                return textPaths
                    .filter((_el: any, idx: number) => (nRef[index] as any) >= idx)
                    .filter((el: any) => el[0] !== undefined)
                    .slice(1);
            }),
        );
    }, [data]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div
                style={{
                    flexGrow: 1,
                }}
            >
                <Typography
                    variant="body1"
                    style={{ cursor: 'pointer' }}
                    onClick={(ev) => {
                        window.wsnavigator(`/library/object?uid=${data.uid}&type=${data?.type?.['unigraph.id']}`);
                    }}
                    onContextMenu={(ev) =>
                        onUnigraphContextMenu(ev, data, callbacks?.context, { ...callbacks, componentId })
                    }
                >
                    {data?._hide ? (
                        []
                    ) : (
                        <Icon
                            path={mdiNoteOutline}
                            size={0.8}
                            style={{ opacity: 0.54, marginRight: '4px', verticalAlign: 'text-bottom' }}
                        />
                    )}
                    <AutoDynamicView
                        object={data.get('text')?._value._value}
                        options={{ inline: true, noDrag: true, noDrop: true, noContextMenu: true }}
                        callbacks={{
                            'get-semantic-properties': () => data,
                        }}
                    />
                    <div style={{ float: 'right' }}>
                        {otherChildren.map((el: any) => (
                            <AutoDynamicView object={el} options={{ inline: true }} />
                        ))}
                    </div>
                </Typography>
                <DataContextWrapper
                    contextUid={data?.uid}
                    contextData={data}
                    parents={dataContext.parents}
                    viewType="$/schema/dynamic_view"
                    expandedChildren
                    subsId={callbacks.subsId}
                >
                    {refObjects?.map((refObject: any, index: number) => (
                        <div style={{ marginTop: index === 0 ? undefined : '16px' }}>
                            <div>
                                {(pathNames[index] || []).map((obj: any, idx: number) => {
                                    const [mdObject, ctx] = obj;
                                    return (
                                        <>
                                            <span
                                                style={{
                                                    fontSize: '12px',
                                                    display: 'inline-block',
                                                    padding: '0px 6px',
                                                    transform: 'translateY(-1px)',
                                                    color: '#a0a0a0',
                                                }}
                                            >
                                                {' > '}
                                            </span>
                                            {ctx?._hide ? null : (
                                                <Icon
                                                    path={mdiNoteOutline}
                                                    size={0.7}
                                                    style={{
                                                        opacity: 0.54,
                                                        marginRight: '4px',
                                                        verticalAlign: 'text-bottom',
                                                    }}
                                                />
                                            )}
                                            <Markdown
                                                data={mdObject}
                                                callbacks={{ ...callbacks, 'get-semantic-properties': () => ctx }}
                                                style={{ display: 'contents', color: 'gray', fontSize: '14px' }}
                                            />
                                        </>
                                    );
                                })}
                            </div>
                            <div style={{ marginLeft: '16px' }}>
                                {noChildren || nestedReferences[index] !== false ? (
                                    []
                                ) : (
                                    <Outline noteBlock={refObject} index={index}>
                                        <AutoDynamicView
                                            object={refObject}
                                            callbacks={{ ...callbacks, isEmbed: true }}
                                            options={{
                                                noClickthrough: true,
                                                noSubentities: true,
                                                expandedChildren: true,
                                                noBacklinks: ['$/schema/note_block', '$/schema/embed_block'].includes(
                                                    refObject.type?.['unigraph.id'],
                                                ),
                                                shouldGetBacklinks: !['$/schema/embed_block'].includes(
                                                    refObject.type?.['unigraph.id'],
                                                ),
                                            }}
                                            components={childrenComponents}
                                            attributes={{
                                                isChildren: true,
                                            }}
                                        />
                                    </Outline>
                                )}
                            </div>
                        </div>
                    ))}
                </DataContextWrapper>
            </div>
        </div>
    );
};

export const NoChildrenReferenceNoteView = ({ data, callbacks }: any) => (
    <ReferenceNoteView data={data} callbacks={callbacks} noChildren />
);
