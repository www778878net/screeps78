import { extend, forEach, memoize, object } from "lodash";
import { basename } from "path";
import { Basic78 } from "./Basic78";
import { RoomData } from "./RoomData";
import { RoomData78 } from "./RoomData78";
import { Ship78 } from "./Ship78";
import { Spawn78 } from "./Spawn78";



/**
 * 

 * */
export class Claim78 extends Basic78 {

    //本模块需要的所有前置
    props: any
    roomdatas: RoomData78//房间数据
    spawn78: Spawn78//生产模块
    createlv: number//生产爬的优先级
    botkind: string//可以自动调配的BOT类型
    

    seting: object//设置数据

    //------------------以下自动管理
    //plans: any;//待建造计划
    //creeps: any;//爬
    //----------------------------
    constructor(props) {
        super();

        this.classname = "Claim78"
        this.logleaveAuto = 40;//27 
     
        super.init();


        //必须要的前置
        if (props) {
            this.roomdatas = props.roomdatas
            this.spawn78 = props.spawn78;
            this.createlv = props.createlv;
            this.botkind = props.botkind;
           
            this.seting = props.seting
            if (props.myownname)
                this.myownname = props.myownname
        }
        this._init();

    }



    _init() {
        if (!this.memoryclass["plans"]) this.memoryclass["plans"] = {}
    }

    Run() {
        //return
        let plans = this.memoryclass["plans"]
        //if (!this.iscanref(this.classname)) return;
       
     
        this.AddLog("runinit:" + this.logleave, 10);
        this._autoPlan()//计算  一个房间一个计划      
        this.AddLog("plans:", 27, plans);
        this._doplan();//是否安排生产
    }



    CreepRun(creep: Creep) {
        this.reflocal(creep)
        let creeps = this.roomdatas.creeps[this.classname];
        let plans = this.memoryclass["plans"]
        let rolekind = creep.memory["rolekind"]
        let rolekey = creep.memory["rolekey"]
        let roomname = creep.memory["roleroom"]
        let role = plans[rolekey]
        if (role) {
            if (role["douser"] != creep.name) {
                delete creep.memory["rolekey"]
                return;
            }
        }           
        else {
            delete creep.memory["rolekey"]
            //creep.moveTo(new RoomPosition(0, 41, "W35N8"))
            //creep.moveTo(new RoomPosition(10, 6, "W7S47"))
            //creep.claimController(Game.getObjectById("5bbcac849099fc012e63599a"))
            //return;
          
            
            //creep.memory["rolekey"]=""
            //delete creep.memory["rolekey"]
             return;
        }
        if (Game.flags.debug && creep.pos.isEqualTo(Game.flags.debug.pos)) {
            creep.memory["isdebug"] = "test"
            this.AddLog("Creep   test in debug:" + this.logleave, 40, creep.pos);
        }
        if (creep.memory["isdebug"])
            this.logleave = 10
        else
            this.logleave = this.logleaveAuto
        this.AddLog("  creeprun init :", 10,creep.memory);
        if (creep.spawning) return;

      
        let rolestep = creep.memory["rolestep"]
        if (!rolestep) {
            rolestep = "move";
            creep.memory["rolestep"] = rolestep
        }
        //creep.memory["targetid"] = role["targetid"]
        let targetid = creep.memory["targetid"]
        let target;
        if (rolestep == "move") {

            if (!targetid) {
                if (!Game.rooms[roomname]) {
                    let des = new RoomPosition(20, 20, roomname)
                    //creep.moveTo(des)
                    creep.moveTo( des)
                    this.AddLog("  creeprun roomname empty   :" + roomname, 40);
                    return;
                }
                targetid = role["targetid"];
                creep.memory["targetid"] = targetid
            }
            target = this.getObjectById(targetid)
            this.AddLog("  creeprun move to  target   :"
                + roomname, 20, target);
            if (creep.pos.isNearTo(target)) {
                rolestep = "working";
                creep.memory["rolestep"] = rolestep
            } else {
                if (!target) {
                    let des = new RoomPosition(20, 20, roomname)
                    //creep.moveTo(des)
                    creep.moveTo(des)
               
                    return
                }
                //this.moveto78(creep, target.pos, 1, creep.pos)
                creep.moveTo(target, { reusePath: 15 })
                return;
            }
            //return;
        }
        target = this.getObjectById(targetid)

        if (rolestep == "working") {
            this.AddLog("  creeprun in  working  :"   + rolestep + " ", 10, target);

            if (!creep.pos.isNearTo(target)) {
                creep.memory["rolestep"] = "move"
                delete creep.memory["state"]
                return
            }
            let isclaimatt = plans[roomname]["roletype"]
            
            let tmp
            if (isclaimatt == "claim") {
                tmp = creep.claimController(target)
                this.AddLog("  creeprun in  working333  :" + rolestep + " ", 20, target);
                if (target["owner"]["username"] == this.myownname) {
                    delete creep.memory["rolekey"]
                    delete creep.memory["rolestep"]
                    delete creep.memory["targetid"]
                }
            }                
            else {
                if (target["reservation"]
                    && target["reservation"]["username"] != this.myownname) {
                    tmp = creep.attackController(target)
                    this.AddLog(target["reservation"]["username"]+"  creeprun in  working att ok :"
                        + this.myownname + tmp + " ", 20, target["reservation"] );

                }
                else {
                    tmp = creep.reserveController(target)
                    this.AddLog("  creeprun in  working ok :"
                        + isclaimatt   + tmp + " ", 20 );

                }


            }



        }



    }

    _doplan() {
        let plans = this.memoryclass["plans"]
        for (let roomname in plans) {
            if (!this.iscanref(roomname)) continue; 
            let role = plans[roomname]
            //!this.seting["rooms"][roomname] &&
            if ( !this.seting["outoce"][roomname]
                && !this.seting["catt"][roomname]      ) {
                delete plans[roomname];
              
                continue;//有了还搞啥
            }
            let roomdata = this.roomdatas.getRoomdata(roomname)
            if (!roomdata || !roomdata.room || !roomdata.room.controller) continue;
            this.AddLog("_doplan:" + roomname + this.myownname, 27 , roomdata.room.controller)
            if (roomdata.room.controller.owner
                && roomdata.room.controller.owner["username"] == this.myownname) {
                if (plans[roomname])
                    delete plans[roomname];
                continue;//有了还搞啥
            }
            let douser = role["douser"]
            if (douser) {
                let creepdouser = Game.creeps[douser]
                if (creepdouser) {
                    if (creepdouser.memory["targetid"] != role["targetid"]) {
                        creepdouser.memory["rolekey"] = roomname
                        creepdouser.memory["roleroom"] = role["roleroom"]
                        creepdouser.memory["roletype"] = role["roletype"]
                        creepdouser.memory["targetid"] = role["targetid"]
                    }
                    continue;
                }
                delete role["douser"]
                douser = null;
            }
            //调度 找本房间和找NEXTROOM二层
            let findcreep = this._getcreep(roomname, role)
            let nexts = this.getNextRooms(roomname)
            if (!findcreep) {
                for (var i = 0; i < nexts.length; i++) {
                    findcreep = this._getcreep(nexts[i], role)
                    if (findcreep) {
                        break;
                    }
                }
            }
            if (!findcreep) {
                //再隔壁的隔壁  
                for (var i = 0; i < nexts.length; i++) {
                    let nexts2 = this.getNextRooms(nexts[i])
                    for (var j = 0; j < nexts2.length; j++) {
                        findcreep = this._getcreep(nexts2[j], role)
                        if (findcreep) {
                            break;
                        }
                    }
                }
            }
            this.AddLog("addplan  find next nextroom findcreep:" + findcreep + roomname, 27)
            let rolekey = role["rolekey"]
            if (findcreep) {
                role["douser"] = findcreep
                let creep = Game.creeps[findcreep]
                creep.memory["rolekey"] = rolekey
                creep.memory["roleroom"] = role["roleroom"]
                creep.memory["roletype"] = role["roletype"]
                creep.memory["targetid"] = role["targetid"]
                //delete role["douser"]
                continue;
            }

            let roletype = role["roletype"] 
            let createlv = this.createlv
            if (roletype == "claim")
                createlv=100
            //生产
            //没找到 请求新建  
                this.spawn78.addplan(rolekey+this.classname , createlv , {
                memory: {
                    rolekind: this.classname
                    , roleroom: roomname
                    , rolekey: rolekey//唯一标记
                    , ckind: this.botkind//有可能一种机型不同的任务的
                    , "roletype": role["roletype"] 
                }
                }, this.addcallback)
            this.AddLog("  addplan  check over not find reqlistadd:" + roomname
                , 27, role)
        }
    }

    addcallback(rolekeyspawn, creepname, createrole) {
        let rolekey = createrole["mempar"]["memory"]["rolekey"]
        let role = Memory["rolelist78"]["Claim78"]["plans"][rolekey]
        console.log("Claim78 addcallback " + rolekey + JSON.stringify(role))
        if (!role) return
        role["douser"] = creepname
    }

    /**
 * 直接按本地位置来找
 * @param findroom
 */
    _getcreep(lockroom, role) {
        let ckind = this.botkind

        let roomname = role["roomname"]
        let findcreep
        let roomdata = this.roomdatas.getRoomdata(lockroom)
        if (!roomdata) return;
        if (!roomdata.globalclass["local"]) roomdata.globalclass["local"] = {}
        let creeps = roomdata.globalclass["local"] [ckind]
        this.AddLog(" _getcreep creeps :" + lockroom
            + ckind, 25, creeps)
        if (!creeps) return ""
        for (let cname in creeps) {
            let creep: Creep = Game.creeps[cname]
            if (!creep) {
                delete creeps[cname]
                continue
            }
            if (!creep.memory["rolekey"])
                return cname
        }

    }

    /**
     * 这里只管添加计划
     * */
    _autoPlan() {
        //if (!this.iscanref(this.classname)) return;
        let plans = this.getMemoryclass()["plans"]
         this.AddLog(" _autoPlan ：", 26, this.seting["outoce"])

        for (let roomname in this.seting["catt"]) {
            this.addlog("_autoPlan", " check2   :" + roomname
                , 15, this.seting["catt"])
            if (!this.iscanref(roomname)) continue;
            let roomdata = this.roomdatas.getRoomdata(roomname) 
            this.addlog("_autoPlan", " check   :" + roomname
                , 15, roomdata)
            if (!roomdata || !roomdata.room) continue;
            if (!roomdata.room.controller) {
                this.AddLog(" check role err controller empty: " + this.classname + roomname , 40)
                continue;
            }
            if (roomdata.room && roomdata.room.controller) { 
                //是别人的了还搞毛线
                if (roomdata.room.controller.owner)
                    continue;
            }
            this.addlog("_autoPlan", " check3   :" + roomname
                , 15, roomdata)
            if (!roomdata.room || !roomdata.room.controller || !roomdata.room.controller.id) continue;
            this.addlog("_autoPlan", " check4   :" + roomname
                , 15, roomdata)
            if (!plans[roomname]) {
                this.getMemoryclass()["plans"][roomname] = {
                    "rolekey": roomname,
                    roleroom: roomname
                    , targetid: roomdata.room.controller.id
                };
                this.AddLog(" check role add: " + this.classname + roomname , 26, plans)
            }
            plans[roomname]["roletype"] = "claim" 
            this.addlog("_autoPlan", " check5   :" + roomname
                , 15, this.getMemoryclass()["plans"][roomname])
        }

        for (let roomname in this.seting["outoce"]) {
             if (!this.iscanref(roomname)) continue;
            let roomdata = this.roomdatas.getRoomdata(roomname)
            this.AddLog(" _autoPlan11 ：" + roomname, 27, roomdata)
            if (!roomdata || !roomdata.room) continue;
            let ticksToEnd = 0
            if (!roomdata.room.controller) {
                this.AddLog(" check role err controller empty: " + this.classname + roomname + ticksToEnd, 40)
                continue;
            }
            this.AddLog(" check1 ：" + roomname, 27, roomdata.room.controller)
            let username = this.myownname
      
            this.AddLog(" check2 ：" + roomname + this.classname, 15, plans)
            if (roomdata.room && roomdata.room.controller) {
                if (roomdata.room.controller.reservation) {
                    ticksToEnd = roomdata.room.controller.reservation.ticksToEnd;
                    username = roomdata.room.controller.reservation.username
                }
                //是别人的了还搞毛线
                if (roomdata.room.controller.owner)
                    continue;
            }
            this.AddLog(" rolelist check " + username + ticksToEnd, 26, plans)
            //大于1200秒不搞了
            if (!plans[roomname]
                && username == this.myownname && ticksToEnd > 1200) continue;
            this.AddLog(" check role: " + this.classname + roomname + ticksToEnd, 26)
            if (!roomdata.room || !roomdata.room.controller || !roomdata.room.controller.id) continue;
            if (!plans[roomname]) {
                plans[roomname] = {
                    "rolekey": roomname,
                    roleroom: roomname
                    , targetid: roomdata.room.controller.id
                };
                this.AddLog(" check role add: " + this.classname + roomname + ticksToEnd, 26, plans)
            }
            plans[roomname]["roletype"] = "up" 
        }


        //for (let roomname in this.seting["rooms"]) {
        //    this.AddLog(" _autoPlan2 ：" + roomname, 10)
        //    if (!this.iscanref(roomname)) continue;
        //    let roomdata = this.roomdatas.getRoomdata(roomname)
        //    this.AddLog(" _autoPlan1 ：" + roomname, 10, roomdata.room.controller)
        //    if (!roomdata || !roomdata.room || !roomdata.room.controller) continue;
        //    if (roomdata.room && roomdata.room.controller && roomdata.room.controller.owner
        //        && roomdata.room.controller.owner["username"] == this.myownname) {
        //        if (plans[roomname])
        //            delete plans[roomname];
        //        continue;//有了还搞啥
        //    }

        //    if (!plans[roomname]) {
        //        plans[roomname] = {
        //            "rolekey": roomname,
        //            roleroom: roomname
        //            , targetid: roomdata.room.controller.id
        //        };
        //    }
        //    plans[roomname]["roletype"] = "claim"
        //}
    }

}
   
     
  
 




 
 
 