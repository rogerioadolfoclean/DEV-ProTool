"use client";
import {useEffect} from "react";
export function AutoRefreshHistory(){useEffect(()=>{const id=window.setInterval(()=>window.location.reload(),5000);return()=>window.clearInterval(id)},[]);return <span className="ml-2 text-[10px] text-emerald-400">● Actualisation automatique</span>}
