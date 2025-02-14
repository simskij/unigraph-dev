import { Badge, ListItemIcon, ListItemText } from '@mui/material';
import { PlayArrow, OpenInNew, TrendingFlat, Repeat } from '@mui/icons-material';
import { unpad } from 'unigraph-dev-common/lib/utils/entityUtils';
import { DynamicViewRenderer } from '../../global.d';
import { ExecutableCodeEditor } from './DefaultCodeEditor';
import { DynamicComponentView } from './DynamicComponentView';
import { runClientExecutable } from '../../utils';

export const Executable: DynamicViewRenderer = ({ data, callbacks }) => {
    // console.log(data);
    const unpadded = unpad(data);
    const icons: any = {
        'routine/js': <PlayArrow />,
        'client/js': <PlayArrow />,
        'component/react-jsx': <OpenInNew />,
        'lambda/js': <TrendingFlat />,
    };
    const actions: any = {
        'routine/js': () => {
            window.unigraph.runExecutable(unpadded['unigraph.id'] || data.uid, {});
        },
        'component/react-jsx': () => {
            // Open in new
            window.newTab(window.layoutModel, {
                type: 'tab',
                name: 'Component preview',
                component: `/pages/library/object`,
                enableFloat: 'true',
                config: { uid: data.uid, type: '$/schema/executable' },
            });
        },
        'lambda/js': async () => {
            const res = await window.unigraph.runExecutable(unpadded['unigraph.id'] || data.uid, {});
            console.log(res);
        },
        'client/js': async () => {
            const ret = await window.unigraph.runExecutable(unpadded['unigraph.id'] || data.uid, {});
            if (ret?.return_function_component !== undefined) {
                // Not a component, but custom code to be run here
                runClientExecutable(ret.return_function_component, {
                    uid: unpadded['unigraph.id'] || data.uid,
                    // callbacks,
                    // contextUid,
                });
            }
        },
    };

    return (
        <>
            <ListItemIcon style={{ paddingLeft: '8px' }} onClick={actions[unpadded.env]}>
                {unpadded.periodic ? (
                    <Badge
                        overlap="circular"
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        badgeContent={<Repeat fontSize="small" />}
                    >
                        {icons[unpadded.env]}
                    </Badge>
                ) : (
                    icons[unpadded.env]
                )}
            </ListItemIcon>
            <ListItemText primary={`Run code: ${unpadded.name}`} secondary={`Environment: ${unpadded.env}`} />
        </>
    );
};

export function CodeOrComponentView(props: any) {
    if (
        // eslint-disable-next-line react/destructuring-assignment
        (props.data as any).get('env').as('primitive') === 'component/react-jsx'
    ) {
        return <DynamicComponentView {...props} />;
    }
    return <ExecutableCodeEditor {...props} />;
}
