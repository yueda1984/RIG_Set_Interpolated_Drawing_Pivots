/*
	Set Interpolated Drawing Pivots v1.11
	
	An experimental script for setting embedded pivots on in-between cells
	based on the first and the last selected cells' pivot positions. 
	
	v1.1 - Script optimization.
	v1.11 - "drawing.elementMode" attribute is changed to "drawing.ELEMENT_MODE" to accomodate Harmony 22 update.
	
	
	Installation:
	
	1) Download and Unarchive the zip file.
	2) Locate to your user scripts folder (a hidden folder):
	   https://docs.toonboom.com/help/harmony-17/premium/scripting/import-script.html	
	   
	3) Add all unzipped files (*.js, and script-icons folder) directly to the folder above.
	4) Add RIG_Set_Interpolated_Drawing_Pivots to Camera or Drawing toolbars.	
	
	
	Direction:

	1) Select a sequence of cells that you want to set embedded pivots to.
	   The first and the last cells will be used as keyframes to determine the
	   positions of the in-between cells.
	2) Run RIG_Set_Interpolated_Drawing_Pivots.

		
	Author:

		Yu Ueda (raindropmoment.com)

*/


function RIG_Set_Interpolated_Drawing_Pivots()
{
	main_function();
	
	function main_function()
	{	
		var pf = new private_functions;
		var sNode = selection.selectedNode(0);
		
		if (node.type(sNode) !== "READ")
		{
			MessageBox.information("Please select a drawing node before running the script.");
			return;
		}
		
		var firstFrame = Timeline.firstFrameSel;
		var numOfFrames = Timeline.numFrameSel;
		var lastFrame = firstFrame + numOfFrames -1;	
		var useTiming = node.getAttr(sNode, 1, "drawing.ELEMENT_MODE").boolValue();
		var drawCol = node.linkedColumn(sNode, useTiming ? "drawing.element" : "drawing.customName.timing");
		
		// Make a list of in-between cels within the selection:
		var iBCelList = pf.makeIBList(drawCol, firstFrame, lastFrame);
		if (iBCelList.length < 1)
		{
			MessageBox.information("At least 3 cels need to be selected for the script to work.");
			return;
		}
		scene.beginUndoRedoAccum("Set Interpolated drawing pivots");
		
			
		// Go through each mid frames and give embedded pivots Interpolated values:
		pf.SetPivotsOnMiddleFrames(sNode, drawCol, firstFrame, lastFrame, iBCelList);
				

		frame.setCurrent(lastFrame);								
		scene.endUndoRedoAccum();		
		MessageLog.trace("Finished setting drawing pivots on " + iBCelList.length + " cels");	
	}






	function private_functions()
	{	
		this.makeIBList = function(drawCol, firstFrame, lastFrame)
		{
			var firstCelName = column.getEntry (drawCol, 1, firstFrame);
			var lastCelName = column.getEntry (drawCol, 1, lastFrame);
			
			var iBCelList = [];	
			for (var f = firstFrame +1; f < lastFrame; f++)
			{
				var curCel = column.getEntry (drawCol, 1, f);	
				if (iBCelList.indexOf(curCel) == -1 && curCel !== firstCelName && curCel !== lastCelName)
					iBCelList.push(curCel);
			}
			return iBCelList;
		}		
		
		
		this.SetPivotsOnMiddleFrames = function(argNode, drawCol, firstFrame, lastFrame, iBCelList)
		{
			// Check the drawing node's Embedded pivot option. Set to apply pivot to drawing it self:
			var embeddedPivotOption = node.getTextAttr (argNode, 1, "useDrawingPivot");	
			if (embeddedPivotOption == "Apply Embedded Pivot on Parent Peg" || embeddedPivotOption == "Don't Use Embedded Pivot")
				node.setTextAttr(argNode, "useDrawingPivot", 1, "Apply Embedded Pivot on Drawing Layer");
			
			var firstPivot = node.getPivot(argNode, firstFrame);
			var lastPivot = node.getPivot(argNode, lastFrame);
			var checkedCels = [];	
			var iBIdx = 1;
			
			Action.perform("onActionChoosePivotTool()", "drawingView,cameraView");
			
			for (var f = firstFrame; f <= lastFrame; f++)
			{
				frame.setCurrent(f);
				DrawingTools.setCurrentDrawingFromNodeName(argNode, f);
				var curCel = column.getEntry (drawCol, 1, f);
				
				for (var iB = 0; iB < iBCelList.length; iB++)
				{
					if (iBCelList[iB] == curCel && checkedCels.indexOf(curCel) == -1)
					{
						var celPivotPos = this.getMidPivotPos(firstPivot.x, firstPivot.y, lastPivot.x, lastPivot.y, iBCelList, iBIdx);
						this.setEmbeddedPivot(celPivotPos.x, celPivotPos.y);
						iBIdx++;					
						checkedCels.push(curCel);
						break;
					}
				}
			}
			// Set the drawing node's embedded pivot option back to the original value:
			node.setTextAttr(argNode, "useDrawingPivot", 1, embeddedPivotOption);
			frame.setCurrent(firstFrame);		
		}


		this.getMidPivotPos = function(firstPosX, firstPosY, lastPosX, lastPosY, iBCelList, iBIdx)
		{
			var newPosX = -(firstPosX - lastPosX) / (iBCelList.length +1) * iBIdx + firstPosX;
			var newPosY = -(firstPosY - lastPosY) / (iBCelList.length +1) * iBIdx + firstPosY;
			var oneField = 208.33333;
			var aspect = scene.unitsAspectRatioY() / scene.unitsAspectRatioX();			
			
			var inPixelX = oneField *newPosX;
			var inPixelY = oneField *newPosY *aspect;
			
			return {x: inPixelX, y: inPixelY};
		}	
		
		
		this.setEmbeddedPivot = function(posX, posY)
		{
			view.currentToolManager().scriptMouseDown(posX,posY, 1, true);
			view.currentToolManager().scriptMouseUp(posX, posY, 1, true);
		}
	}
}