import { Directive } from "@angular/core";


@Directive({
    selector: 'button[safeCancel]',
    standalone: true,
    host:{
        '(click)': 'onCancelButton($event)'
    }
})

export class CustomPipe{

    constructor(){
        console.log('Safe Cancel button works and is active')
    }

    onCancelButton(event:MouseEvent){
        const wantsToCancel = window.confirm('Are you sure that you want to cancel or delete it?')
        if(wantsToCancel){
            return
        }

        event.preventDefault()
    }

}