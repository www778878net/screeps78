import { object } from 'lodash';
//import { sayHello } from './menu/test'
import { errorMapper } from './modules/errorMapper'
 
//import { RoleCenter08 } from './role09/RoleCenter08';
//import { RoleCenter } from './role10/RoleCenter';

import { RoleCenter23 }    from './role2308/RoleCenter23';
 
 //sourcecreepnum ÿ��source�ж���creep Ӧ��ûɶ�� �²��Ծ�����
//sourcebusynum source���г̶�
declare global {
    var tick: number;//ÿN��TIckִ��һ��
    var mine: any;//�ҵ�����
    var mine9: any;//�ҵ�����
    var test: any;
    
    var RoleCenter23: RoleCenter23
    //var Memory: any;
}
export { };
//require('Move3');
//import { wrapFn, MoveTo3 } from "./Move3"
//let test = require('./Move3')
//console.log(test)
export const loop = errorMapper(() => {
    //if (_global_memory) {
    //    delete global.Memory;
    //    global.Memory = _global_memory;
    //    RawMemory._parsed = global.Memory;
    //} else {
    //    _global_memory = global.Memory
    //}
    //console.log(wrapFn)
    //console.log(MoveTo3)
    //Creep.prototype.moveTo = wrapFn(MoveTo3 , 'moveTo');
    
    if (!global.tick  || global.tick >= 100) {
        global.tick = 1; 

    }
    else
        global.tick++;
    //sayHello();
    if (Game.cpu.bucket == 10000) {
        Game.cpu.generatePixel();
    }
    if (!global.mine9) global.mine9 = {}
    if (!global.RoleCenter23) {
        global.RoleCenter23 = new RoleCenter23(null) 
        //global.RoleCenter = new RoleCenter({
        //    ship78: global.RoleCenter23.ship78
        //    , spawn78: global.RoleCenter23.spawn78
        //}) 
       
    }
    //new RoleCenter08().run9()
    //global.mine9["Spawn78"]["createlist"] = {}
    global.RoleCenter23.run()
    //global.RoleCenter.run()
    global.RoleCenter23.runover()
    
    // delete Memory["rolelist78"]["Oce78"]["sources"]
     
    //delete Memory["rolelist78"] 
    //delete Memory["rolelist78"]["Ship78"]
    //delete Memory["rolelist78"]["Up78"]["controlls"]["5bbcab1e9099fc012e632df2"]
})