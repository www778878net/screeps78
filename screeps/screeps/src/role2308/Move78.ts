import { extend, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";


/**
 * 
 * 移动 输出：就是管理移动
 * */
export class Move78 extends Basic78 {   
    
    //本模块需要的所有前置
    props: any  
    roomdatas: RoomData78;
    //------------------以下自动管理
    pathsave: any;//保存的路径
    CostMatrix: any;//保存的寻路参数
    //----------------------------
    constructor(props) {  
        super();
        this.classname = "Move78"  
        super.init();
        //this.globalclass = global.mine9[this.classname]//任务挂
        //必须前置
        if (props) {
            //props.roomdata 所有已知房间数据 避免重复查找 尽量用RoomData78
            this.roomdatas = props.roomdatas
        }
       

        if (!this.globalclass["path"]) this.globalclass["path"] = {}
        if (!this.globalclass["CostMatrix"]) this.globalclass["CostMatrix"] = {}
        this.pathsave = this.globalclass["path"]    
        this.CostMatrix = this.globalclass["CostMatrix"]   
        delete Memory["rolelist78"][this.classname]
    }

    /**
     * 
     * @param creep
     * @param targetpos
     * @param sourcepos 有就有 没有传空这边会自动换成罐子或本房间的souce或某个固定坐标10，10
     */
    moveTo(creep: Creep, targetid, sourcepos: RoomPosition) {
        /**未解决:
        * 没有sourcepos不要用creeppos才好 因为这个每次会变 
        * 边界问题
        * 。move78 path   pos moveto :不应该是找个可移动的点 应该是最近的点
        * 。参考它的 如果不在一个房间 49就右移 0就左移嘛就对了
        * 问题:
       .走不动了没识别到
       .缓存的路径没在路径上
       解决: 
       .先获取s2t的路径 
       .如果有 我不在路径上 倒循环直到range大了或到1了
       .判断下个点能否移动
       .如果不能移动moveto 下个点  
       */
        if (!creep) {
            this.AddLog(" move78 creep empty err :"
                , 10);
            return
        }
        if (creep.memory["isdebug"])
            this.logleave = 10
        else
            this.logleave = this.logleaveAuto
        this.AddLog(" move78 test :" + this.logleave
            , 10,creep.pos);
        let target = this.getObjectById(targetid)
        if (!target || !target["pos"]) {
            this.AddLog(" move78 targetpos empty err :" + targetid
                , 10, target);
            return
        }
        let targetpos: RoomPosition = target["pos"];
        if (creep.fatigue > 0) return;
        let creeproom = creep.room.name
        let creeproomdata: RoomData = this.roomdatas.getRoomdata(creeproom)
        //sourcepos 传空 .sourcepos用Storage没有的话用第一个souce 或随便一个固定点
        if (!sourcepos) {
            if (creep.room.storage)
                sourcepos = creep.room.storage.pos
            else if (creeproomdata.sources)
                sourcepos = creeproomdata.sources[0].pos
            else {
                for (var x = 0; x < 10; x++) {
                    for (var y = 0; y < 10; y++) {
                        sourcepos = new RoomPosition(x + 10, y + 10, creeproom)
                        if (this._getPosCanMove(sourcepos)) {
                            break;
                        }
                    }
                }
            }
        }

        let goals = { pos: targetpos, range: 1 }
        let getpath = targetpos.roomName + "_" + targetpos.x + "_" + targetpos.y
            + "_" + sourcepos.roomName + "_" + sourcepos.x + "_" + sourcepos.y

        let getpathtargetid = creep.memory["getpathtargetid"]
        if (getpathtargetid != targetid) getpathtargetid = ""
        let creepgetpath = creep.memory["getpath"]
        let path
        if (creepgetpath) {
            path = this.pathsave[creepgetpath]
            if (!path) {
                delete creep.memory["getpath"]
                delete creep.memory["getpathtargetid"]
                getpathtargetid = "";
            }
        }
        this.AddLog(" move78 path test creeptargetpos:" + (getpathtargetid == targetid)
            + (targetpos.roomName != creep.room.name)
            , 10, targetpos);
        let self = this;
       

        if (path &&getpathtargetid == targetid) {
            let creepgetpathnum = creep.memory["getpathnum"]
            //有可能可移动目标 但走到同房间之前不用管  
            if (true || targetpos.roomName != creep.room.name) {
                let pos = path[creepgetpathnum]
                if (!pos) {
                    delete creep.memory["getpath"]
                    self.AddLog(" getpathtargetid == targetid err pos empty  :" + creepgetpathnum
                        , 40, path);
                    return
                }
                if (pos.x == 0 || pos.x == 49 || pos.y == 0 || pos.y == 49) {
                    creepgetpathnum++
                    pos = path[creepgetpathnum]
                }
                let rpos: RoomPosition = new RoomPosition(pos.x, pos.y, pos.roomName)
                this.AddLog(" move78 path test next pos:" 
                    , 10, rpos);
                if (!this._getPosCanMove(rpos)) {
                    //有可能挡住 找到路径上下一个可以移动的点
                    for (var i = 0; i < path.length; i++) {
                        if (path.length <= creepgetpathnum) {
                            delete creep.memory["getpath"]
                            this.AddLog(" move78 path path.length <= creepgetpathnum:"
                                , 40, creep.pos);
                            //creep.moveTo(targetpos)
                            return
                        }
                        pos = path[creepgetpathnum]
                        if (!pos) continue
                        rpos = new RoomPosition(pos.x, pos.y, pos.roomName)
                        if (!creep.pos.isEqualTo(rpos)) {
                            if (this._getPosCanMove(rpos))
                                break;
                        }
                        creepgetpathnum++
                        creep.memory["getpathnum"] = creepgetpathnum
                    }
                }
                //直接向下个点移动
                if (creep.pos.isNearTo(rpos)) {
                    creep.move(creep.pos.getDirectionTo(pos));
                    creep.memory["getpathnum"] = creepgetpathnum++
                    return
                }
                else {
                    creep.moveTo(rpos)
                    //不能加 有可能点在前面
                }
            }
            //到了同房间 位置不同了 只有直接moveto了
            // let getpathtarget = this.getObjectById(getpathtargetid)
            return
        }
       

       



        //这就要找路径并存起来了
        path = PathFinder.search(
            sourcepos, goals,
            {     // 我们需要把默认的移动成本设置的更高一点
                // 这样我们就可以在 roomCallback 里把道路移动成本设置的更低
                plainCost: 2,
                swampCost: 10,
                maxOps: 9999,
                roomCallback: function (roomName) {

                    let costs = self.CostMatrix[roomName];
                    self.AddLog(" _move78 roomCallback  :" + roomName
                        , 10);
                    if (costs) return costs
                    let room = Game.rooms[roomName];
                    // 在这个示例中，`room` 始终存在
                    // 但是由于 PathFinder 支持跨多房间检索
                    // 所以你要更加小心！
                    if (!room) return;
                    //后面要实时更新 
                    costs = new PathFinder.CostMatrix;
                    room.find(FIND_STRUCTURES).forEach(function (struct) {
                        if (struct.structureType === STRUCTURE_ROAD) {
                            // 相对于平原，寻路时将更倾向于道路
                            costs.set(struct.pos.x, struct.pos.y, 1);
                        } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                            (struct.structureType !== STRUCTURE_RAMPART
                                //|| !struct.my
                            )) {
                            // 不能穿过无法行走的建筑
                            costs.set(struct.pos.x, struct.pos.y, 0xff);
                        }
                    });
                    self.CostMatrix[roomName] = costs
                    //// 躲避房间中的 creep
                    //room.find(FIND_CREEPS).forEach(function (creep) {
                    //    costs.set(creep.pos.x, creep.pos.y, 0xff);
                    //});

                    return costs;
                },
            }
        )

        path = path.path
        this.pathsave[getpath] = path
        creep.memory["getpathtargetid"]=targetid
        //计算当前位置
        //如果creep room在路径上就可以找到最近的点
        let nearmax = 999;
        try {

            for (var i = path.length - 1; i >= 0; i--) {
                let pos = path[i]
                this.AddLog(" move78 path test find getpathnum:" + nearmax + " " + creepgetpath
                    , 0, pos);
                if (!pos) continue;
                if (creep.room.name != pos.roomName) {
                    if (nearmax == 999) {
                        creep.memory["getpath"] =getpath
                        creep.memory["getpathnum"] = i
                        //nearmax = 998
                    }
                    continue;
                } 
          
                let nearnow = creep.pos.getRangeTo(new RoomPosition(pos.x, pos.y, pos.roomName))
                if (nearnow < nearmax) {
                    nearmax = nearnow
                    creep.memory["getpath"] = getpath
                    creep.memory["getpathnum"] = i 
                } else {//找到了

                    break;
                }
            }
        } catch (e) {
            this.AddLog(" move78 path catch err 3322:"
                , 40, path);
        }
        this.AddLog("getpath save:" + i + getpath
            , 10, path);
    }
     
  
   
     
  
 


}

 
 
 