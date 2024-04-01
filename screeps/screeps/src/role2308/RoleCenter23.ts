import { Basic78 } from "./Basic78";
import { RoomData78 } from "./RoomData78";
import { Ship78 } from "./Ship78";
import { Spawn78 } from "./Spawn78";
import { Oce78 } from './Oce78';
import { GameInit } from "./GameInit";
import { Watch78 } from "./Watch78";
import { Up78 } from "./Up78";
import { Claim78 } from "./Claim78";
import { Def78 } from "./Def78";
import { Build78 } from "./Build78";
import { Store78 } from "./Store78";

/**
 * 任务类 入口
 * 总功能模块 和全局状态
 * */
export class RoleCenter23 extends Basic78 {   
    
    //本模块需要的所有前置
    props: any
    roomdatas: RoomData78//props.roomdata 所有已知房间数据 避免重复查找 尽量用RoomData78

    spawn78: Spawn78//造爬功能
    ship78: Ship78//运输模块
    oce78: Oce78//采矿功能
    gameinit78: GameInit//防卡 造一个爬采矿
    watch78: Watch78//点亮
    up78: Up78//升级功能
    claim78: Claim78//占领房间或添加控制时间
    def78: Def78//简易防御 
    build78: Build78//建造功能
    store78: Store78//移动仓库功能

    seting:object
    //------------------以下自动管理
    
    //----------------------------
    constructor(props) {
        super( ); 
        this.classname = "RoleCenter"  
        this.logleaveAuto = 40;  
        super.init();

        //经常要调的参数
        this.seting = {
            rooms: {
                "W5S48": { roomname: "W5S48" }
                , "W6S48": { roomname: "W6S48" }
                , "W7S47": { roomname: "W7S47" }
                //, "W34N9": { roomname: "W34N9" }
                 //, "W36N8": { roomname: "W36N8" }
                // , "E38N15": { roomname: "E38N15" }
            }
            , outoce: {//控制外矿

                "W4S48": { roomname: "W4S48" }
                , "W4S47": { roomname: "W4S47" }
                , "W3S48": { roomname: "W3S48" }
                , "W4S49": { roomname: "W4S49" }

                , "W6S47": { roomname: "W6S47" }

                , "W7S46": { roomname: "W7S46" }
                , "W7S48": { roomname: "W7S48" }
                , "W8S47": { roomname: "W8S47" }
                , "W9S47": { roomname: "W9S47" }
              
               //, "W35N8": { roomname: "W35N8" }
                //, "W31S53": { roomname: "W31S53" }
                //, W31S55: { roomname: "W31S55" }
                //, W33S54: { roomname: "W32S54" }
            }
            , catt: { //占地盘

                // "W7S47": { roomname: "W7S47" }
            } 
        }
        //this.globalclass = global.mine9[this.classname]//任务挂
        //必须前置 new完带进来
        if (props) {
            //this.roomdatas = props.roomdatas
            //this.move78 = props.move78
            //this.gameinit78 = props.gameinit78
            //this.oce78 = props.oce78;
            //this.spawn78 = props.spawn78;
            ////this.terminal78 = props.terminal78
            ////this.lab78 = props.lab78
            //this.ship78 = props.ship78
            //this.up78 = props.up78;
            //this.build78 = props.build78;
            //this.store78 = props.Store78;
            //this.claim78 = props.claim78;
            //this.watch78 = props.watch78;
            //this.def78 = props.def78
            //this.attsimp = props.attsimp
        } else {
            this.defaultinit()//全用自己的就自动new
        }

        this.AddLog("RoleCenter23 new" , 40);//1 2
        //delete Memory["creeps"]
    }

    runover() {
        //this.AddLog("RoleCenter23 runover", 40);//1 2
        let timeleave = 40
        let dstartall = new Date();
        let dstart1 = new Date();
        let usetime2;
        dstart1 = new Date();
        this.CreepRun();//这个第二后
        usetime2 = new Date().getTime() - dstart1.getTime()
        if (usetime2 >= 5)
            this.AddLog("creeprun   usetime:" + " " + usetime2, timeleave);//1 2
        dstart1 = new Date();
        this.spawn78.run();//这个要最后
        usetime2 = new Date().getTime() - dstart1.getTime()
        if (usetime2 >= 2)
            this.AddLog("spawn78   usetime:" + " " + usetime2, timeleave);//1 2
        dstart1 = new Date();
        this.gameinit78.run();//这个才要最后
        usetime2 = new Date().getTime() - dstart1.getTime()
        if (usetime2 >= 2)
            this.AddLog("gameinit78   usetime:" + " " + usetime2, timeleave);//1 2
    }

    run() {
      
        let timeleave = 40
        //if (!global.mine9["Spawn78"]) global.mine9["Spawn78"] = {}
        //global.mine9["Spawn78"]["createlist"] = {}
        
        let dstartall = new Date();
        let dstart1 = new Date();
        let usetime2;
        try {
            this.roomdatas.run();
            this.test()
            usetime2 = new Date().getTime() - dstart1.getTime()
            if (usetime2 >= 2)
                this.AddLog("test   usetime1:" + " " + usetime2, timeleave);//1 2
        } catch (e) {
            this.AddLog("catch roomdatas.run err  :" , 90);
        } 
        //try {
            dstart1 = new Date();
            //this.terminal78.run();
       
            //this.test78.run()
            this.up78.run();
            usetime2 = new Date().getTime() - dstart1.getTime()
            if (usetime2 >= 2)
                this.AddLog("up78   usetime:" + " " + usetime2, timeleave);//1 2
        //} catch(e) {
        //    this.AddLog("catch up78.run err  :", 90);
        //} 

        //try {
            dstart1 = new Date();
            this.oce78.run();      
            usetime2 = new Date().getTime() - dstart1.getTime()
            if (usetime2 >= 2)
                this.AddLog("oce78   usetime:" + " " + usetime2, timeleave);//1 2
        //} catch(e) {
        //    this.AddLog("catch oce78.run err  :", 90);
        //} 
       
        //try {
            dstart1 = new Date();
            this.ship78.run();
            usetime2 = new Date().getTime() - dstart1.getTime()
            if (usetime2 >= 2)
                this.AddLog("ship78   usetime:" + " " + usetime2, timeleave);//1 2
        //} catch (e) {
        //    this.AddLog("catch ship78.run err  :", 90);
        //} 

        //try {

            dstart1 = new Date();
            this.build78.Run();
            usetime2 = new Date().getTime() - dstart1.getTime()
            if (usetime2 >= 2)
                this.AddLog("build78   usetime:" + " " + usetime2, timeleave);//1 2
        //} catch(e) {
        //    this.AddLog("catch build78.run err  :", 90);
        //} 
  

        try {
            dstart1 = new Date();
            this.watch78.Run(); 
            this.def78.run();
            //this.attsimp.Run();
            usetime2 = new Date().getTime() - dstart1.getTime()
            if (usetime2 >= 2)
                this.AddLog("claim78 def78   usetime:" + " " + usetime2, timeleave);//1 2
        } catch (e) {
            this.AddLog("catch def78.run err  :", 90);
        } 

        //try {
        dstart1 = new Date();
         this.claim78.Run();

        usetime2 = new Date().getTime() - dstart1.getTime()
        if (usetime2 >= 2)
            this.AddLog("claim78 watch78   usetime:" + " " + usetime2, timeleave);//1 2
        //} catch(e) {
        //    this.AddLog("catch claim78.run err  :", 90);
        //} 

       

        usetime2 = new Date().getTime() - dstartall.getTime()
        if (usetime2 >= 5)
            this.AddLog("all   usetime:" + " " + usetime2, timeleave);//1 2
    }

    CreepRun() {
        let debugcreepname = "";
        let debugrolekey = "";
        let debugroom = ""
        for (var crindex in Game.creeps) {
            let creep = Game.creeps[crindex];
            let dstart1 = new Date();
            let rolekind = creep.memory["rolekind"];
            let rolekey = creep.memory["rolekey"]
            let rolestep = creep.memory["rolestep"]
            let roletype = creep.memory["roletype"]

            this.AddLog("CreepRun :" + rolekind + " " + creep.memory["kind"]
                + " " + rolekey + " " + creep.id, 20, creep.pos);

            //try {
            switch (rolekind) {
                case "AttSimp":
                    //this.attsimp.CreepRun(creep);
                    break;
                case "Def78":
                    this.def78.CreepRun(creep);
                    break;
                case "Claim78":
                    this.claim78.CreepRun(creep);
                    break;
                case "Watch78":
                    //try {
                    this.watch78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch CreepRun watch78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break;
                case "Store78":
                    //try {
                        this.store78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch CreepRun store78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break;
                case "Build78":
                    //try {
                        this.build78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch CreepRun Build78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break;
                case "Ship78":
                    //try {
                         this.ship78.CreepRun(creep);
                    //} catch (e) {
                    //    this.AddLog("catch CreepRun Ship78 err  :" + rolekind, 90, creep.pos);
                    //} 
                    break; 
                case "Oce78":
                     this.oce78.CreepRun(creep);
                    break;
                case "Up78":
                    /*try {*/
                        this.up78.CreepRun(creep)
                    //} catch (e) {
                    //    this.AddLog("catch up78 Build78 err  :" + rolekind, 90, creep.pos);
                    //} 
                   
                        break;
                }
            //} catch (e) {
            //    this.AddLog("catch CreepRun err  :" + rolekind, 90, creep.pos);
            //}
       
            let usetime2 = new Date().getTime() - dstart1.getTime()
            if (usetime2 >= 3)
                this.AddLog(" CreepRun time:" + usetime2 + " " + rolekind + " "  + rolekey, 40, creep.pos);//0 1

        }

    }

    defaultinit() {
        let seting =this.seting
        //try {
         this.roomdatas = new RoomData78(null); //这个必须第一
        //} catch (e) {
        //    this.AddLog("   defaultinit new RoomData78:" , 90,e);
        //}
        this.spawn78 = new Spawn78({
            roomdatas: this.roomdatas
            , seting: seting
        });   
        this.ship78 = new Ship78({
            roomdatas: this.roomdatas
            , createlv: 55//50
            , spawn78: this.spawn78
            , botkind: "CShip78"//可以自动调配的BOT类型
        }); 
        //this.move78 = new Move78({ roomdatas: this.roomdatas });
        this.gameinit78 = new GameInit({ roomdatas: this.roomdatas });    
        //this.test78 = new Test(null);
        this.store78 = new Store78({
            roomdatas: this.roomdatas,
            ship78: this.ship78,
            spawn78: this.spawn78
            , botkind: "CStore78"//可以自动调配的BOT类型
            , createlv: 50
        })
        this.oce78 = new Oce78({
            roomdatas: this.roomdatas,
            ship78: this.ship78,
            spawn78: this.spawn78
            , botkind: "COce78"//可以自动调配的BOT类型
            ,createlv: 70,   //70       
            seting: seting
        });     
        this.build78 = new Build78({
            roomdatas: this.roomdatas,
            ship78: this.ship78,
            spawn78: this.spawn78
            , store78: this.store78
            , botkind: "CBuild78"//可以自动调配的BOT类型
            , createlv: 65
            , walldefault: 20 * 1000
            , seting: seting
             ,   wall: {
                 "W6S48": 80 * 1000
                 , "W5S48": 80 * 1000
                 , "W7S47": 80 * 1000
                }
             
        });     
        this.claim78 = new Claim78({
            roomdatas: this.roomdatas, 
            spawn78: this.spawn78 
            , botkind: "CClaim78"//可以自动调配的BOT类型
            , createlv: 40 
            , seting: seting
          
        });   
    
        this.up78 = new Up78({
            roomdatas: this.roomdatas,
            ship78:this.ship78,
            spawn78: this.spawn78
            , botkind: "CUp78"//可以自动调配的BOT类型
            , createlv: 45 //45
            , warknummax: 15
            , seting: seting
        });  
        this.watch78 = new Watch78({
            roomdatas: this.roomdatas,
            spawn78: this.spawn78
            , botkind: "CWatch78"//可以自动调配的BOT类型
            , createlv: 999//反正才50
            , seting: seting
        });   
        this.def78 = new Def78({
            roomdatas: this.roomdatas, 
            spawn78: this.spawn78 
            , botkind: "CDef78"//可以自动调配的BOT类型
            , createlv: 100 
            , seting: seting
        });  
        //this.attsimp = new AttSimp({
        //    roomdatas: this.roomdatas, 
        //    spawn78: this.spawn78 
        //    , botkind: "CAttSimp"//可以自动调配的BOT类型
        //    , createlv: 10 
        //    , seting: seting
        //    , attrooms: {
        //       // "W31S54": { roomname: "W31S54" }
        //    }

        //});   
        //this.lab78 = new Lab78({ roomdatas: this.roomdatas }); 
      
        //this.terminal78 = new Terminal78({
        //    baseroom: "E38N16"
        //    , roomdatas: this.roomdatas
        //    , "storelist": {
        //        //E42N59: {
        //        //    K: { num: 1000, buyval: 0.701 }
        //        //    , H: { num: 1000, buyval: 10.002 }
        //        //    , KH: { num: 1000, buyval: 10.011 }
        //        //}
        //    }
        //    , EnergySellValue:8.001
        //})

    }

    test() { 
        let debugcreep = Game.creeps["debug"]
        if (debugcreep) {
            this.debugrolekey = debugcreep.memory["rolekey"];
            this.debugsourceid = debugcreep.memory["sourceid"]
            this.debugtargetid = debugcreep.memory["targetid"] 
            this.debugcreepname = debugcreep.memory["creepname"] 
        }
        else {
            this.debugrolekey = "";
            this.debugsourceid = ""
            this.debugtargetid = "" 
            this.debugcreepname = "";
        }
        //this.lab78.getLabForBoost("E38N16","KH",100,"test")
        //let room78 = this.roomdatas.getRoomdata("E38N16")
        //let spawns = room78.globalclass["spawn"]

        delete Memory["rolelist78"]["undefined"]
        delete Memory["rolelist78"]["Test"]
         //global.mine9["Spawn78"]["createlist"] = {}    
    }
     
 
   
     
  
 


}

 
 
 