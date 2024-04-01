import { extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";

/**
 * 如果一个SCREEP都没有了 它就启动 造一个爬去采矿并回来
 * */
export class GameInit extends Basic78 {   
    
    //本模块需要的所有前置
    props: any 
    roomdatas: RoomData78//房间数据
    //------------------以下自动管理
    creeps:any
    //----------------------------
    constructor(props) {
        super(); 
     
        this.classname = "GameInit"
        
        super.init();
         //必须要的前置
        if (props) { 
            this.roomdatas = props.roomdatas
        } 
 
        this.logleave = 40;  
        this._init()
        delete Memory["rolelist78"][this.classname]
    }  

    run() {
    
        this.AddLog("run init:", 15);
        if (Game.creeps["GameInit"]) {
            //try {
            this._runinit();
            //} catch (e) {
            //    this.AddLog("err GameInit _runinit :", 90, e);
            //} 
            return;
        }
        
        if (!this.iscanref(this.classname)) {
            return;
        }

        if (Object.keys(Game.creeps).length >= 3) {
            return;
        }
        //好象有BUILD了不用这样判断了
        let havestore = false;
        for (let roomname in Game.rooms) {
            let roomdata: RoomData = this.roomdatas.getRoomdata(roomname)
            if (!roomdata || !roomdata.spawnname) continue;
            this.AddLog("getstructByType init:", 15, roomdata.getstructByType(STRUCTURE_CONTAINER));
            if (roomdata.getstructByType(STRUCTURE_CONTAINER)) {
                havestore = true
                break;
            }
        }
        this.AddLog("run test init:" + havestore + (havestore && Object.keys(Game.creeps).length >= 3), 50);
        if (havestore && Object.keys(Game.creeps).length >= 3) {           
        //if (Object.keys(Game.creeps).length >= 3) {    
            return;
        }
        for (let index in Game.spawns) {
            let spawn = Game.spawns[index]
            let room = spawn.room;
            let energyAvailable = room.energyAvailable - 300;
            let body = [WORK, CARRY, CARRY, MOVE, MOVE]
            // body = [  CARRY, CARRY, MOVE, MOVE]
            for (var i = 0; i < 10; i++) {
                if (energyAvailable < 100) break;
                if (energyAvailable >= 300) {
                    body.push(WORK, CARRY, CARRY, MOVE, MOVE);
                    energyAvailable -= 300;
                } else if (energyAvailable >= 100) {
                    body.push(CARRY, MOVE);
                    energyAvailable -= 100;
                }
                else if (energyAvailable >= 50) {
                    body.push(MOVE);
                    energyAvailable -= 50;
                }

            }
            let tmp = spawn.spawnCreep(body, 'GameInit');
            this.AddLog("创建 机器人 GameInit " + tmp, 50, body)
            return
        }
    }
 
    
    

    _init() {
        //把这个任务的爬和所有的矿拉过来
        this.creeps = this.roomdatas.creeps[this.classname];
    }

    /**
     * 采矿 补SPAWN 修理 升级
     * */
    _runinit() {         
        let creep = Game.creeps["GameInit"]
        let room = creep.room
        let roomname = room.name;
        let roomdata = this.roomdatas.getRoomdata(roomname);
       
        if (creep.memory["isdebug"])
            this.logleave = 10
        else
            this.logleave = this.logleaveAuto
        let targetid = creep.memory["targetid"]
        let rolekind = creep.memory["rolekind"]
        if (!rolekind) {
            rolekind = "oce";
        }
        this.AddLog("_runinit:" + rolekind, 10, roomdata)
        if (!targetid) {
            creep.memory["targetid"] = roomdata["sources"][0]["id"]
            return;
        } 
        let target: any = this.getObjectById(targetid)//矿
        if (!target) return;


        if (rolekind == "upgrade") {
            if (creep.store.getUsedCapacity() == 0) {
                creep.memory["rolekind"] = "oce"
                return;
            }
            //没有建造工地了 就升级
            let source = this.getObjectById(room.controller.id);
            this.AddLog("CreepBuild build    role_target controller:" + creep.pos.inRangeTo(source, 3), 0);
            if (creep.pos.inRangeTo(source, 3)) {
                let tmp = creep.upgradeController(source);
                this.AddLog("CreepBuild        controller upgradeController:" + tmp, 0);
            }
            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        if (rolekind == "build") {
            if (creep.store.getUsedCapacity() == 0) {
                creep.memory["rolekind"] = "oce"
                return;
            }
            let buildid = creep.memory["buildid"]
            if (!buildid) {
                for (let i in roomdata.globalclass.constructionsites ) {
                    this.AddLog("_runinit build:" + i, 10, roomdata.globalclass.constructionsites)
                    creep.memory["buildid"] = roomdata.globalclass.constructionsites[i]["id"]
                    return;
                }  
            }
            let build: any;
            try {
                 build = this.getObjectById(buildid)
            } catch (e) {
                delete creep.memory["buildid"]
            }
         
            if (!build) {
                delete creep.memory["buildid"]
                creep.memory["rolekind"] = "upgrade"
                return;
            }
            this.AddLog("_runinit :build" + rolekind, 10, build.pos)
            if (creep.pos.isNearTo(build)) {
                let tmp = creep.build(build);
                return;
            }

            creep.moveTo(build, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }
            
        if (rolekind == "fillspawn") {
            if (creep.store.getUsedCapacity() == 0) {
                creep.memory["rolekind"] = "oce"
                return;
            }
            if (room.energyAvailable == room.energyCapacityAvailable) {
                creep.memory["rolekind"] = "build"
                return;
            }
            this.AddLog("fillspawn:" + rolekind + roomdata.spawnname, 10 )
            let sourceid = Game.spawns[roomdata.spawnname].id;
            if (!sourceid) {
                this.AddLog("_runinit sourceid:", 10, roomdata.globalclass["spawn"])

                creep.memory["sourceid"] = Object.keys(roomdata.globalclass["spawn"])[0]
                return;
            }
            let source: any = this.getObjectById(sourceid)
            if (!source) return;
            if (creep.pos.isNearTo(source)) {
                creep.transfer(source, RESOURCE_ENERGY)
                return;
            }

            creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
           
           
            return;
        }

        if (rolekind == "getpower") {
            if (creep.store.getFreeCapacity() == 0) {
                creep.memory["rolekind"] = "fillspawn"
                return;
            }
            let targetid = creep.memory["sourceid"]
            let target: any = this.getObjectById(targetid)
            this.AddLog("getpower  target :" , 10, target);
            if (!target || target["energy"] < 30) {
                delete creep.memory["sourceid"]
                creep.memory["rolekind"] = "oce"
                return;
            }
            if (creep.pos.isNearTo(target)) {
                let tmp = -1
                if (target.store) {
                    this.AddLog("pickup test  arget.storo   :" + Object.keys(target.store), 10, target.store);
                    let len = Object.keys(target.store).length

                    for (var key in target.store) {
                        if (key == "energy")
                            continue
                        let type: any = key
                        tmp = creep.withdraw(target, type);
                        this.AddLog("pickup test  arget.storo   :" + tmp + key, 10, target.store[key]);
                        break;
                    }

                }
                if (tmp != 0)
                    tmp = creep.pickup(target);
                if (tmp != 0)
                    tmp = creep.withdraw(target, RESOURCE_ENERGY);
                this.AddLog("pickup pickup    :" + tmp, 20);
                return
            }
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }
        this.AddLog("test: ", 20, roomdata)
        if (rolekind == "oce") {
            if (creep.store.getFreeCapacity() == 0) {
                creep.memory["rolekind"] = "fillspawn"
                return;
            }
            let sourceid = creep.memory["sourceid"]
            if (sourceid) {
                creep.memory["rolekind"] = "getpower"
                return;
            }
            let structs = room.find(FIND_DROPPED_RESOURCES)
            for (var i = 0; i < structs.length; i++) {
                let structtmp = structs[i]
                this.AddLog("pickup find :" + this.logleave, 20, structtmp);
                //"energy":486,"amount":486,"resourceType":"energy"
                let energy = structtmp["energy"];
                if (energy < 30) continue;
                let id = structtmp.id
                creep.memory["sourceid"] = id
                creep.memory["rolekind"] = "getpower"
                return;
            }
            if (creep.pos.isNearTo(target)) {
                let tmp = creep.harvest(target)
                if (tmp == ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }

                return
            }
            creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }
     
        
    }

  
     
  
   
     
  
 


}

 
 
 