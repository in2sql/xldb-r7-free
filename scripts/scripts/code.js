/**
 *Скрипт базового окна плагина XLDB
 */

const TypeExternalForms ={NO_TABLE:-1,TREE_OBJECT:3,ABOUT:4,};
//Типы плагина
const TypeInternalForms={ONE_VERSION:0,TWO_VERSION:1,THREE_VERSION:2};

(function(window, c=undefined){
	var formElement={};
	//var loader;
	let modalWindow = null;	
	var currType=TypeInternalForms.ONE_VERSION;
	
	var dbUserName="play";	
	var dbUrlReguest="play.clickhouse.com";	

	var connectionURL=['play.clickhouse.com'];
	var connectionUser=['play'];
	var connectionPassw=[''];
	var connectionList=[];	
	var connectionItem=undefined;
	var iConnection=0;
	
	var bShowPassword=true;
	var accordionOfConnection=undefined;
	var stateObject=undefined;
	var msgCheckBox=undefined;

	var abc=[];

	//Добавить новое соединение
	function addNewConnections(){
		if(connectionItem!=undefined){
			//если есть новое соединение 
			connectionItem['name']=$('#connection_name').val();
			//Проверка, что все поля заполненый иначе модальное окно, что надо ввести все поля
			if(connectionItem['name']==""
			||connectionItem['username']==undefined 
			//|| connectionItem['password']==undefined 
			|| connectionItem['url']==undefined){
				$( "#dialog-warning" ).dialog( "open" );//Модальное окно
				$( "#dialog-message" ).dialog( "option", "title",  window.Asc.plugin.tr('Warning!'));				
			}
			else{//Все поля заполнены, добавить в список
				if(currType==TypeInternalForms.ONE_VERSION){
					onRemoveConnection('delete_connection0');
					connectionList[0]=connectionItem;					
				}				
				saveState();
			}
		}
	};	
	
	//отработка нажатия на кнопку удалить соединение внутри описателя соединений в аккардеоне
	function onRemoveConnection(idToDelete){
		var tmp,num;
		tmp='delete_connection';//название id кнопки без номера		
		//console.log("Delete "+idToDelete);
		if(idToDelete.length>0){
			//вычлиняем номер
			tmp=idToDelete.substring(tmp.length,idToDelete.length);
			if(tmp.length>0)
			{
				num=Number(tmp);
				//удалить в аккардеоне элементы с таким же номером
				$("#header_connection"+num).remove();
				$("#connection"+num).remove();
				//обновить аккардеон
				if($('.ui-accordion-header').length>0)
					$( "#connection_list" ).accordion( "refresh" );
				//Удалить все связанные запросы
				if(connectionList.length>0 && connectionList.length>=num){
					let connectItem = connectionList[num];
					if(connectItem!=undefined && connectItem['name'].length>0)
					{
						var nameDeleteConnection=connectItem['name']
						if(nameDeleteConnection.length>0){							
							delete connectItem;
							connectionList.splice(num,1);
							saveState();								
						}														
					}																												
				}
			}
		}
	};

	//Создание модальных окон
	function createWindow(typeExternalForms,data) {
		var variation={};
		let location  = window.location;
		let start = location.pathname.lastIndexOf('/') + 1;
		let file = location.pathname.substring(start);
		
		// default settings for modal window
		switch(typeExternalForms)
		{			
			case TypeExternalForms.TREE_OBJECT:				
				variation = {
					url : location.href.replace(file, 'index_tree_object.html'),
					description : window.Asc.plugin.tr('Make SQL'),
					isVisual : true,
					isModal : true,
					EditorsSupport : ["cell"],
					buttons : [],
					size : [1000, 670]
				};
				break;
			case TypeExternalForms.ABOUT:
			{
				variation = {
					description : window.Asc.plugin.tr('About'),
					url: location.href.replace(file,"about.html"),	
					icons : ["resources/xldb.png"],
					isViewer: true,
					EditorsSupport: ["cell"],	
					isVisual: true,
					isModal: true,
					isInsideMode: false,	
					buttons:[ { "text": "Ok", "primary": true } ],	
					size: [400, 250]
				}
			}
		}
		
		if (!modalWindow) {
			modalWindow = new window.Asc.PluginWindow();
			modalWindow.attachEvent("onWindowMessage", function(message) {
				messageHandler(modalWindow, message);
			});
		}
		modalWindow.show(variation);
	};

	//универсальная функция деспетчер сообщений между окнами плагина
	function messageHandler(modal, message) {		
		var ret;
		switch (message.type) {
			case "onExecuteMethod":
				window.Asc.plugin.executeMethod(message.method, [message.data]);								
				break;
			case "onFillTableFromJson":
				ret=message.data;				
				if(ret.length>0){					
					fillSheet(ret);					
				}				
				break;					
			case "onCancelMethod":				
					window.Asc.plugin.executeMethod('CloseWindow', [modal.id]);				
				break;			
		}
	};

	function createAccordionOfConnections(){
		accordionOfConnection=$( '#connection_list' ).accordion({				
				collapsible: true,
		   });		
	}

	function createConnectAccorionItem(){
		if(accordionOfConnection==undefined){
			createAccordionOfConnections()
		}
		
		if(connectionItem!=undefined){												
			str="<h3 id='header_connection"+ iConnection +"'>" + connectionItem['name'] + "</h3>";
			str+="<div id='connection"+ iConnection +"'>";
			str+="<table>";
			str+="<tr>";
			str+="<td><label class='connection_lb_name'>Name: </label></td><td>"+ connectionItem['name'].substring(0,20)+ "</td>";
			str+="</tr><tr>";
			str+="<td><label class='connection_lb_url'>Url: </label></td><td>" + connectionItem['url'].substring(0,40) + "..." +"</td>";
			str+="</tr><tr>";
			str+="<td><label class='connection_lb_username'>Username: </label></td><td>"+ connectionItem['username'].substring(0,20)+ "</td>";			
			str+="</tr></table>";
			if(currType!=TypeInternalForms.ONE_VERSION){
				//кнопка удаление текущего соединения
				str+="<button class= 'delete_connection' id='delete_connection"+ iConnection +"'>Delete connection</button>";																
			}			
			else{
				str+="<button class= 'delete_connection' id='delete_connection"+ iConnection +"'>Delete connection</button>";
				//Во free версии может быть только одно соединение и для этого каждый раз надо пересоздавать аккордион и только потом добавлять в него соединение
				$('#connection_list').accordion( "destroy" );				
				createAccordionOfConnections();	
			}			
			
			$('#connection_list').append(str);
			//обновить список аккардеона
			$( "#connection_list" ).accordion( "refresh" );
			//обработка нажатия кнопки "удалить текущее соединение"
			$("#delete_connection"+ iConnection).click(function(){
				onRemoveConnection($(this).attr('id'));						
			});
			
			if(currType!=TypeInternalForms.ONE_VERSION){
				iConnection++;
			}
		}
	}

    window.Asc.plugin.init = function()
    {		
		var contextURL='ConnectionURL';
		var contextUser='ConnectionUser';
		var contextPassw='ConnectionPassw';

		localStorage.removeItem('docSheets');
		
		fillAbcArray();
		Asc.scope.abcArr=abc;

		//Заполняем объекты контролов для удобства в дальнейшем при работе с jQuery
		formElement={			
			//Контролы вкалдки "Запрос"			
			btnCreateConnection:document.getElementById("create_connection"),
			btnSaveSql:document.getElementById("save_sql"),
			btnCheckSql:document.getElementById("check_sql"),
			btnMakeSql:document.getElementById("make_sql"),			
			btnShowPassword:document.getElementById("show_password"),
			btnShowAbout:document.getElementById("show_about"),
			connectionMenu:document.getElementById( "connection_menu"),
			connectionList:document.getElementById( "connection_list"),
			connectionName:document.getElementById( "connection_name"),
			connectionUrl:document.getElementById( "connection_url"),
			connectionUser:document.getElementById( "connection_username"),
			connectionPassw:document.getElementById( "connection_password"),
		}
		
		//контролы плагина работающие на базе jQuery
		$(function() {
		   //Диалоговое сообщение что не все поля заполнены
		   $( "#dialog-warning" ).dialog({
				modal: true,				
				width: 200,
				title:window.Asc.plugin.tr('Warning!'),
				autoOpen: false,
				buttons: {
					Ok: function() {
						$( this ).dialog( "close" );
					}
				}
		  	});

			createCheckMessageBox();

			//Кнопка создать новое соединение открывает скрытые поля выбора значений для него
			$(formElement.btnCreateConnection).click(function(){	
				if($(formElement.connectionMenu).css('display')=='none'){
					$(formElement.connectionMenu).css('display','block');
					$( "#save_sql" ).prop('disabled', true);					
				}
				else{//повторное нажатие снова скрывает поля
					$(formElement.connectionMenu).css('display','none');
				}
			});			
			
			//заполнение контекстных полей
			fillContextMenu(connectionURL,contextURL,'#ul-context-url-menu');
			fillContextMenu(connectionUser,contextUser,'#ul-context-user-menu');
			fillContextMenu(connectionPassw,contextPassw,'#ul-context-passw-menu');			
			
			//Создание контексных меню для новых соединений			
			//Меню "имя пользователя"
			$("#connection_username").ClassyContextMenu({				
				menu: 'context-user-menu',
				mouseButton: 'right',
				onSelect: function(e) {
					var idMenu;					
					idMenu=e.id.substring(contextUser.length+1,e.id.length);
					var text=connectionUser[Number(idMenu)];				
					$(formElement.connectionUser).val(text);
					if(connectionItem!=undefined){
						connectionItem['username']=text;
					}
				}
			});
			//Меню "адрес соединения"
			$("#connection_url").ClassyContextMenu({				
				menu: 'context-url-menu',
				mouseButton: 'right',
				onSelect: function(e) {
					var idMenu;									
					idMenu=e.id.substring(contextURL.length+1,e.id.length);
					var text=connectionURL[Number(idMenu)];	
					$(formElement.connectionUrl).val(text);
					if(connectionItem!=undefined){
						connectionItem['url']=text;
					}
				}
			});
			//Меню "пароль"
			$("#connection_password").ClassyContextMenu({				
				menu: 'context-passw-menu',
				mouseButton: 'right',
				onSelect: function(e) {
					var idMenu;										
					idMenu=e.id.substring(contextPassw.length+1,e.id.length);
					var text=connectionPassw[Number(idMenu)];
					$(formElement.connectionPassw).val(text);
					if(connectionItem!=undefined){
						connectionItem['password']=text;
					}
				}
			});

			//Создание новых элементов в аккардионе перечисления создаваемых соединений
			$(formElement.btnSaveSql).click(function(){							
				connectionItem=new Object();
				connectionItem['name']=$(formElement.connectionName).val();
				connectionItem['username']=$(formElement.connectionUser).val();
				connectionItem['url']=$("#connection_url").val();
				connectionItem['password']=$(formElement.connectionPassw).val();	
				addNewConnections();
				createConnectAccorionItem();
			});
			
			$(formElement.btnCheckSql).click(function(){
				checkRequest();
			});

			$(formElement.btnMakeSql).click(function(){				
				createWindow(TypeExternalForms.TREE_OBJECT);
			});

			$(formElement.btnShowAbout).click(function(){
				createWindow(TypeExternalForms.ABOUT);
			});

			$(formElement.btnShowPassword).click(function(){
				if(bShowPassword){
					bShowPassword=false;
					$("#connection_password").prop("type","text");
				}
				else{
					bShowPassword=true;
					$("#connection_password").prop("type","password");
				}
			});

		});	
		
		var strState=localStorage.getItem('xldbFreeStateConnect');
		if(strState!=undefined)	{
			stateObject=JSON.parse(strState);
			if(stateObject!=undefined)
			{				
				readSavedState(stateObject);
			}
		}
		else{
			stateObject=new Object();
			stateObject['connectionList']={};
			stateObject['queryList']={};
		}		
	};	

    window.Asc.plugin.onThemeChanged = function(theme)
    {
        window.Asc.plugin.onThemeChangedBase(theme);
        var rule = ".select2-container--default.select2-container--open .select2-selection__arrow b { border-color : " + window.Asc.plugin.theme["text-normal"] + " !important; }";
        var styleTheme = document.createElement('style');
        styleTheme.type = 'text/css';
        styleTheme.innerHTML = rule;
        document.getElementsByTagName('head')[0].appendChild(styleTheme);
    };	

    window.Asc.plugin.button = function(id, windowId) {
		if (!modalWindow)
			return;

		if (windowId) {
			switch (id) {
				case -1:
				default:								
					window.Asc.plugin.executeMethod('CloseWindow', [windowId]);
			}
		}		
	};

	window.Asc.plugin.onTranslate = function(){
		//Внутри index.HTML 
		document.getElementById("create_connection").innerHTML = window.Asc.plugin.tr("Connection");
		document.getElementById("connect_list").innerHTML = window.Asc.plugin.tr("Connection list:");
		document.getElementById("connection_name").innerHTML = window.Asc.plugin.tr("Connection name");
		document.getElementById("connection_url").innerHTML = window.Asc.plugin.tr("Connection url");
		document.getElementById("connection_username").innerHTML = window.Asc.plugin.tr("Username");
		document.getElementById("connection_password").innerHTML = window.Asc.plugin.tr("Password");		
		document.getElementById("make_sql").innerHTML = window.Asc.plugin.tr("Make SQL");
		document.getElementById("save_sql").innerHTML = window.Asc.plugin.tr("Save");
		document.getElementById("check_sql").innerHTML = window.Asc.plugin.tr("Check");
		document.getElementById("show_about").innerHTML = window.Asc.plugin.tr("About");
		document.querySelectorAll(".tooltip_demo").forEach(el => {el.innerHTML = window.Asc.plugin.tr("To create a demo connection, right-click")});		
		//Внутри  скрипта code.js
		document.getElementById("p-dialog-warning").innerHTML = window.Asc.plugin.tr("dialog1");
		document.getElementById("p-dialog-check").innerHTML = window.Asc.plugin.tr("dialog2");
		document.querySelectorAll(".connection_lb_name").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Connection name")});
		document.querySelectorAll(".connection_lb_url").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Connection url")});
		document.querySelectorAll(".connection_lb_username").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Username")});
		document.querySelectorAll(".connection_lb_passw").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Password")});
		document.querySelectorAll(".delete_connection").forEach(el => {el.innerHTML = window.Asc.plugin.tr("Delete connection")});
	}

	//Сохранить в localStorage текущее состояние (настройк подключения и запросы к каждом у из них)
	function saveState(){
		if(stateObject!=undefined){
			stateObject['connectionList']=connectionList;			
			localStorage.setItem('xldbFreeStateConnect',JSON.stringify(stateObject));
		}
	};

	function readSavedState(jsonState)	{
		if(jsonState!=undefined){
			connectionList=jsonState['connectionList'];
			if(connectionList!=undefined && connectionList.length>0){
				iConnection=0;
				connectionList.forEach(element=>{
					connectionItem=element;					
					createConnectAccorionItem();	
				});
				connectionItem=connectionList[0];
				$(formElement.connectionName).val(connectionItem['name']);
				$(formElement.connectionUrl).val(connectionItem['url']);
				$(formElement.connectionUser).val(connectionItem['username']);
				$(formElement.connectionPassw).val(connectionItem['password']);
				connectionItem=undefined;
			}
			else{
				$(formElement.connectionName).val('demo');
				$(formElement.connectionUrl).val(dbUrlReguest);
				$(formElement.connectionUser).val(dbUserName);
				$(formElement.connectionPassw).val('');
			}			
		}
	}

	function showCheckDialog(txtMessage,bShow){		
		if(bShow==true)
		{	
			$( "#p-dialog-check" ).text( txtMessage );
			$( "#dialog-check" ).dialog( "option", "title", window.Asc.plugin.tr('Check'));
			$( "#dialog-check" ).dialog( "open" );

		}else{
			$("#dialog-check" ).dialog( "close" );
		}
	};

	function createCheckMessageBox(){
		if(msgCheckBox==undefined){
			msgCheckBox=$( "#dialog-check" ).dialog({
				modal: true,				
				width: 200,
				title:window.Asc.plugin.tr('Check'),
				autoOpen: false,
				buttons: {
					Ok: function() {
						$( this ).dialog( "close" );
					}
				}
			});
		}
	};

	function checkRequest(){		
		connectionItem=new Object();
		connectionItem['name']=$(formElement.connectionName).val();
		connectionItem['username']=$(formElement.connectionUser).val();
		connectionItem['url']=$(formElement.connectionUrl).val();
		connectionItem['password']=$(formElement.connectionPassw).val();
		let checkUrl="https://"+connectionItem['url']+"/?user="+connectionItem['username']+"&password="+connectionItem['password']+"&query="+"SHOW TABLES";
		
		fetch(checkUrl)//Собственно сам ассинхронный запрос к серверу
		.then((response) => {
			if (response.status >= 200 && response.status < 300) {
				if( msgCheckBox==undefined)
					createCheckMessageBox();
				showCheckDialog(window.Asc.plugin.tr('Connection verified successfully!'),true);//Ассинхронная обработка полученного результата
				$( "#save_sql" ).prop('disabled', false);
			} else {
				let error = new Error(response.statusText);					
				throw error;
			}				
		})	
		.catch(function(e){//Простейшая обработка ошибки запроса
			if( msgCheckBox==undefined)
				createCheckMessageBox();
			showCheckDialog(window.Asc.plugin.tr('Error verified сonnection!')+e,true);
		});
	};

	//Заполнение контекстного меню для полей нового соединения
	function fillContextMenu(arr,nameMenu,id_menu){
		var strMenu,nameItem;
		var i=0;
		arr.forEach(itm=>{
			if(itm.length>20)
				nameItem=itm.substring(0,20)+"...";
			else
				nameItem=itm;
			strMenu="<li id='"+ nameMenu +"_"+ i +"'><img src='resources/add.png'/><a href='#"+nameMenu+"_"+i+"'>"+nameItem+"</a></li>";
			$(id_menu).append(strMenu);
			i++;
		});
	};

	//Заполнение таблицы после успешного запроса к СУБД 
	function fillSheet(textBuf){			
		Asc.scope.st =textBuf; 
		fillJSONData();				
	};

	//Разбор и заполнение таблицы полученными данными в формате JSON
	function fillJSONData(){			
		window.Asc.plugin.callCommand(function() {								
			var idx="";
			var header="";
			var i=0,j=0,l,m;
			var rowCount=-1;
			var colCount=-1;
			var firstCell;
			var cell;
			var colBegin;
			var rowBegin;
			var oWorksheet ={};
			var abc=Asc.scope.abcArr;

			oWorksheet =Api.GetActiveSheet();				
			var oSelectRange =oWorksheet.GetActiveCell();
			if(oSelectRange!=undefined){
				colBegin=oSelectRange.Col-1;
				rowBegin=oSelectRange.Row;
			}
			else{
				colBegin=0;
				rowBegin=0;
			}
			
			var req=JSON.parse(Asc.scope.st);																						
			if(req["meta"].length>0){				
				let meta=req["meta"];
				colCount=meta.length;
				let data=req["data"];
				let query=req["query"];
				
				rowCount=data.length;					
				if(rowCount>0){																			
					l=0;
					for(j=colBegin;j<(colCount+colBegin);j++){
						idx=abc[j]+rowBegin;										
						header=meta[l].name;								
						oWorksheet.GetRange(idx).SetValue(header);
						l++;					
					}
					
					m=0;
					for(i=rowBegin;i<(rowCount+rowBegin);i++){																							
						let row=data[m];
						l=0;
						for(j=colBegin;j<(colCount+colBegin);j++){
							idx=abc[j]+(i+1);																			
							cell=oWorksheet.GetRange(idx);
							cell.SetValue(row[meta[l].name]);

							l++;					
						}
						m++;							
					}
					
					firstCell=abc[colBegin]+(rowBegin);	
					if(query!=undefined){
						let cell=oWorksheet.GetRange(firstCell);
						if(cell!=undefined){
							let comment=cell.GetComment();
							if (comment!=undefined)
								comment.Delete();					
							cell.AddComment(JSON.stringify(query));
						}
						let nameDiap=oWorksheet.GetName()+'!$'+abc[colBegin]+'$'+(rowBegin)+':$'+abc[colBegin+colCount]+'$'+(rowBegin+rowCount);
						
						oWorksheet.AddDefName(query['query_name'],nameDiap);							
					}
									
					oWorksheet.FormatAsTable(firstCell+":"+abc[colBegin+colCount-1]+(rowBegin+rowCount));
					oWorksheet.GetRange(firstCell+":"+abc[colBegin+colCount]+rowBegin).AutoFit(false,true);														
				} 
			}														
		}, undefined,undefined,function(result){});		
	};
	
	function fillAbcArray(){
		var i,j,alph;
		var arrAbc=["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
		
		for(i=-1;i<arrAbc.length+1;i++){
			for(j=0;j<arrAbc.length;j++){
				if(i==-1){
					alph=arrAbc[j];
				}
				else{
					alph=arrAbc[i]+arrAbc[j];
				}
				abc.push(alph);
			}
		}
	};

})(window, undefined);

