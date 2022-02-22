import { mdiBookOpenOutline, mdiCalendarAlert, mdiCalendarOutline, mdiInboxOutline } from '@mdi/js';
import { Add as AddIcon, CalendarToday, PriorityHigh } from '@mui/icons-material';
import { Checkbox, Chip, Divider, Fab, ListItemText, Typography } from '@mui/material';
import _ from 'lodash/fp';
import React from 'react';
import Sugar from 'sugar';
import { UnigraphObject } from 'unigraph-dev-common/lib/utils/utils';
import { AutoDynamicView } from '../../components/ObjectView/AutoDynamicView';
import { BacklinkView } from '../../components/ObjectView/BacklinkView';
import { DynamicViewRenderer } from '../../global.d';
import { registerDynamicViews, registerQuickAdder } from '../../unigraph-react';
import { parseTodoObject } from './parseTodoObject';
import { TodoAll, TodoInbox, TodoMenuItems, TodoMenuSidebar, TodoToday, TodoUpcoming } from './TodoViews';
import { ATodoList, maxDateStamp } from './utils';

export const TodoItem: DynamicViewRenderer = ({ data, callbacks, compact, inline, isEmbed }) => {
    const NameDisplay = React.useMemo(
        () => (
            <AutoDynamicView
                object={data.get('name')?._value?._value}
                key="name"
                options={{ noDrag: true, noDrop: true, noContextMenu: true }}
                callbacks={{
                    'get-semantic-properties': () => data,
                }}
            />
        ),
        [data],
    );

    const SecondaryDisplay = React.useMemo(
        () => (
            <>
                {!data?._value?.children?.['_value[']
                    ? []
                    : data?._value?.children?.['_value[']
                          ?.filter((it: any) => !it._key)
                          .map((it: any) => (
                              <AutoDynamicView
                                  object={new UnigraphObject(it._value)}
                                  callbacks={callbacks}
                                  options={{ inline: true }}
                              />
                          ))}
                {data.get('priority')?.as('primitive') > 0
                    ? [
                          <Chip
                              size="small"
                              icon={<PriorityHigh />}
                              label={`Priority ${data.get('priority')?.as('primitive')}`}
                          />,
                      ]
                    : []}
                {data.get('time_frame/start/datetime')?.as('primitive') &&
                new Date(data.get('time_frame/start/datetime')?.as('primitive')).getTime() !== 0
                    ? [
                          <Chip
                              size="small"
                              icon={<CalendarToday />}
                              label={`Start: ${Sugar.Date.relative(
                                  new Date(data.get('time_frame/start/datetime')?.as('primitive')),
                              )}`}
                          />,
                      ]
                    : []}
                {data.get('time_frame/end/datetime')?.as('primitive') &&
                new Date(data.get('time_frame/end/datetime')?.as('primitive')).getTime() !== maxDateStamp
                    ? [
                          <Chip
                              size="small"
                              icon={<CalendarToday />}
                              label={`End: ${Sugar.Date.relative(
                                  new Date(data.get('time_frame/end/datetime')?.as('primitive')),
                              )}`}
                          />,
                      ]
                    : []}
            </>
        ),
        [callbacks, data],
    );

    const onPointerUp = React.useCallback(
        (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            data.get('done')['_value.!'] = !data.get('done')['_value.!'];
            window.unigraph.updateObject(
                data.uid,
                {
                    _value: {
                        uid: data._value.uid,
                        done: { uid: data._value.done.uid, '_value.!': data.get('done')['_value.!'] },
                    },
                    _hide: data.get('done')['_value.!'],
                },
                !data._value.uid,
                false,
                callbacks?.subsId,
                undefined,
                true,
            );
        },
        [data?.get('done')?.['_value.!'], callbacks?.subsId, data.uid],
    );

    const checkbox = React.useMemo(
        () => (
            <Checkbox
                size={callbacks.isEmbed ? 'small' : 'medium'}
                key="checkbox"
                style={{
                    padding: callbacks.isEmbed ? '2px' : '',
                    marginRight: callbacks.isEmbed ? '4px' : '',
                    alignSelf: 'baseline',
                }}
                checked={data.get('done')?.['_value.!']}
                onPointerUp={onPointerUp}
            />
        ),
        [data.get('done')?.['_value.!'], callbacks.isEmbed, onPointerUp],
    );

    // console.log(data.uid, unpadded)
    return (
        <div style={{ display: 'flex' }}>
            {checkbox}
            {
                // eslint-disable-next-line no-nested-ternary
                callbacks.isEditing ? (
                    []
                ) : callbacks.isEmbed ? (
                    [
                        NameDisplay,
                        <Divider
                            orientation="vertical"
                            style={{ marginLeft: '4px', marginRight: '4px' }}
                            key="divider"
                        />,
                        SecondaryDisplay,
                    ]
                ) : (
                    <ListItemText
                        style={{ margin: compact ? '0px' : '', alignSelf: 'center' }}
                        primary={NameDisplay}
                        key="name"
                        secondary={
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    flexWrap: 'wrap',
                                }}
                            >
                                {SecondaryDisplay}
                            </div>
                        }
                    />
                )
            }
        </div>
    );
};
const parsedHasTags = (parsed: ATodoList | any) => {
    const tags = parsed?.children.filter(_.propEq(['_value', 'type', 'unigraph.id'], '$/schema/tag'));
    return tags ? tags.length > 0 : false;
};
const quickAdder = async (
    inputStr: string,
    // eslint-disable-next-line default-param-last
    preview = true,
    callback?: any,
    refs?: any,
) => {
    const parsed = parseTodoObject(inputStr, refs);
    if (!preview) {
        // eslint-disable-next-line no-return-await
        const uid = await window.unigraph.addObject(parsed, '$/schema/todo');
        if (!parsedHasTags(parsed)) {
            window.unigraph.runExecutable(
                '$/executable/add-item-to-list',
                {
                    where: '$/entity/inbox',
                    item: uid,
                },
                undefined,
                undefined,
                true,
            );
        }
        console.log('adding todo', { uid, parsed });

        return uid;
    }
    return [parsed, '$/schema/todo'];
};

const tt = () => (
    <>
        <Typography style={{ color: 'gray' }}>Examples:</Typography>
        <Typography>@tomorrow-&quot;next Friday&quot; #unigraph hello world</Typography>
        <Typography style={{ color: 'gray' }} variant="body2">
            doable from tomorrow, due next Friday
        </Typography>
        <Typography>@tomorrow #unigraph hello world</Typography>
        <Typography style={{ color: 'gray' }} variant="body2">
            due tomorrow
        </Typography>
        <Typography>!5 very important stuff</Typography>
        <Typography style={{ color: 'gray' }} variant="body2">
            priority 5
        </Typography>
    </>
);

export const init = () => {
    const description = 'Add a new Todo object';
    registerDynamicViews({
        '$/schema/todo': {
            view: TodoItem,
            query: (uid: string) => `
            (func: uid(${uid})) {
                uid
                type { <unigraph.id> }
                dgraph.type
                <_hide>
                <_value> {
                    uid
                    name {
                        uid _value {
                            dgraph.type uid
                            type { <unigraph.id> }
                            _value { dgraph.type uid type { <unigraph.id> } <_value.%> }
                        }
                    }
                    done { uid <_value.!> }
                    priority { <_value.#i> }
                    time_frame {
                        uid _value {
                            dgraph.type uid type { <unigraph.id> }
                            _value {
                                start {
                                    uid _value {
                                        dgraph.type uid
                                        type { <unigraph.id> }
                                        _value { datetime { <_value.%dt> } timezone { <_value.%> } }
                                    }
                                }
                                end {
                                    uid _value {
                                        dgraph.type uid
                                        type { <unigraph.id> }
                                        _value { datetime { <_value.%dt> } timezone { <_value.%> } }
                                    }
                                }
                            }
                        }
                    }
                    children {
                        <_value[> {
                            uid _key _index {<_value.#i> uid}
                            _value {
                                dgraph.type uid type { <unigraph.id> }
                                _value {
                                    dgraph.type uid type { <unigraph.id> }
                                    _value {
                                        uid name { uid <_value.%> }
                                        color { uid _value { <_value.%> dgraph.type uid type { <unigraph.id> } } }
                                    }
                                }
                            }
                        }
                    }
                }
            }`,
        },
    });
    registerQuickAdder({
        todo: {
            adder: quickAdder,
            tooltip: tt,
            description,
            alias: ['td'],
        },
    });
};

// const makeTodoInbox = (theseProps: any) => <TodoInbox {...theseProps} />;
// const makeTodoAll = (theseProps: any) => <TodoAll {...theseProps} />;
export const TodoList = (props: any) => {
    const [mode, setMode] = React.useState('inbox');

    const [todoMenuModes, setTodoMenuModes] = React.useState<TodoMenuItems>(() => {
        return {
            inbox: {
                iconPath: mdiInboxOutline,
                text: 'Inbox',
                component: TodoInbox,
            },
            all: {
                iconPath: mdiBookOpenOutline,
                text: 'All Todos',
                component: TodoAll,
            },
            today: {
                iconPath: mdiCalendarOutline,
                text: 'Today',
                component: TodoToday,
            },
            upcoming: {
                iconPath: mdiCalendarAlert,
                text: 'Upcoming',
                component: TodoUpcoming,
            },
        };
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'row' }}>
            <div style={{ flexBasis: '15%', height: '100%' }}>
                <TodoMenuSidebar
                    mode={mode}
                    setMode={setMode}
                    todoMenuModes={todoMenuModes}
                    setTodoMenuModes={setTodoMenuModes}
                    todoListProps={props}
                />
            </div>
            <div style={{ flexBasis: '85%', height: '100%' }}>
                {todoMenuModes[mode].component({ ...props, key: mode })}
            </div>
            <Fab
                aria-label="add"
                style={{ position: 'absolute', right: '16px', bottom: '16px' }}
                onClick={() => {
                    window.unigraph.getState('global/omnibarSummoner').setValue({
                        show: true,
                        tooltip: 'Add a todo item',
                        defaultValue: '+todo ',
                    });
                }}
            >
                <AddIcon />
            </Fab>
        </div>
    );
};
