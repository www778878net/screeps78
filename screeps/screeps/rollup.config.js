import clear from 'rollup-plugin-clear'
import screeps from 'rollup-plugin-screeps'
import copy from 'rollup-plugin-copy'
// �ڴ���ͷ�������
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'

let config
// ����ָ����Ŀ���ȡ��Ӧ��������
if (!process.env.DEST) console.log("δָ��Ŀ��, ���뽫�����뵫�����ϴ�")
else if (!(config = require("./.secret.json")[process.env.DEST])) {
    throw new Error("��ЧĿ�꣬���� secret.json ���Ƿ������Ӧ����")
}

// ����ָ�������þ������ϴ����Ǹ��Ƶ��ļ���
const pluginDeploy = config && config.copyPath ?
    // ���Ƶ�ָ��·��
    copy({
        targets: [
            {
                src: 'dist/main.js',
                dest: config.copyPath
            },
            {
                src: 'dist/main.js.map',
                dest: config.copyPath,
                rename: name => name + '.map.js',
                transform: contents => `module.exports = ${contents.toString()};`
            }
        ],
        hook: 'writeBundle',
        verbose: true
    }) :
    // ���� .map �� .map.js ���ϴ�
    screeps({ config, dryRun: !config })

export default {
    input: 'src/main.ts',
    output: {
        file: 'dist/main.js',
        format: 'cjs',
        sourcemap: true
    },
    plugins: [
        // ����ϴα���ɹ�
        clear({ targets: ["dist"] }),
        // �������
        resolve(),
        // ģ�黯����
        commonjs(),
        // ���� ts
        typescript({ tsconfig: "./tsconfig.json" }), // <== ������һ�У�ע���Ⱥ�˳��Ҫ�����
        // ִ���ϴ����߸���
        pluginDeploy
    ]
};