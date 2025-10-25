// app/api/chatgpt/live-scan/route.js

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'

/**
 * Live ChatGPT Scanner API
 * Spawns Python scanner and streams progress via Server-Sent Events
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's latest scan with commercial prompts
    const { data: scan, error: scanError } = await supabase
      .from('tool_integrations')
      .select('commercial_prompts, company_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (scanError || !scan) {
      return NextResponse.json({ 
        error: 'No commercial prompts found. Please run AI Visibility scan first.' 
      }, { status: 400 })
    }
    
    const queries = scan.commercial_prompts || []
    const companyName = scan.company_name || ''
    
    if (queries.length === 0) {
      return NextResponse.json({ 
        error: 'No queries to scan' 
      }, { status: 400 })
    }
    
    // Create SSE stream
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'scan_start',
              data: {
                company: companyName,
                queries: queries,
                total: queries.length
              }
            })}\n\n`
          ))
          
          // Setup Chrome profile directory
          // OPTION 1: Use existing ChatGPT profile (RECOMMENDED)
          const userDataDir = "C:\\Users\\imre\\AppData\\Local\\Google\\Chrome\\User Data\\ChatGPT_UCD_Profile"
          
          // OPTION 2: Use default Chrome profile (if ChatGPT is logged in there)
          // const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data')
          
          // OPTION 3: Create new profile per user (requires manual ChatGPT login first)
          // const userDataDir = path.join(os.homedir(), '.teun-ai', 'chrome-profiles', user.id)
          
          // Python scanner path (adjust based on your setup)
          const scannerPath = path.join(process.cwd(), 'scripts', 'chatgpt_live_scanner.py')
          
          // Spawn Python process (using Python 3.12 for compatibility)
          const pythonProcess = spawn('py', [
            '-3.12',  // Use Python 3.12 (undetected-chromedriver doesn't work with 3.13)
            scannerPath,
            userDataDir,
            companyName,
            ...queries
          ])
          
          // Buffer for incomplete lines
          let buffer = ''
          
          // Handle stdout (progress updates)
          pythonProcess.stdout.on('data', (data) => {
            const text = data.toString()
            buffer += text
            
            // Process complete lines
            const lines = buffer.split('\n')
            buffer = lines.pop() // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.startsWith('PROGRESS:')) {
                try {
                  const progressData = JSON.parse(line.substring(9))
                  
                  // Forward to client
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify(progressData)}\n\n`
                  ))
                  
                  // Store in database (for historical tracking)
                  if (progressData.type === 'query_complete') {
                    storeQueryResult(supabase, user.id, progressData.data)
                  }
                  
                } catch (e) {
                  console.error('Failed to parse progress:', e)
                }
              }
            }
          })
          
          // Handle stderr (errors)
          pythonProcess.stderr.on('data', (data) => {
            console.error('Python stderr:', data.toString())
            
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                data: {
                  message: data.toString()
                }
              })}\n\n`
            ))
          })
          
          // Handle process completion
          pythonProcess.on('close', (code) => {
            if (code === 0) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'complete',
                  data: {
                    success: true
                  }
                })}\n\n`
              ))
            } else {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  data: {
                    message: `Process exited with code ${code}`
                  }
                })}\n\n`
              ))
            }
            
            controller.close()
          })
          
          // Handle process errors
          pythonProcess.on('error', (error) => {
            console.error('Python process error:', error)
            
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({
                type: 'critical_error',
                data: {
                  message: error.message
                }
              })}\n\n`
            ))
            
            controller.close()
          })
          
        } catch (error) {
          console.error('Stream error:', error)
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'critical_error',
              data: {
                message: error.message
              }
            })}\n\n`
          ))
          
          controller.close()
        }
      },
      
      cancel() {
        console.log('Stream cancelled by client')
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    })
    
  } catch (error) {
    console.error('Live scan error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * Store query result in database
 */
async function storeQueryResult(supabase, userId, data) {
  try {
    await supabase
      .from('chatgpt_live_scans')
      .insert({
        user_id: userId,
        query: data.query,
        found: data.found,
        position: data.position,
        snippet: data.snippet,
        response_length: data.response_length,
        scanned_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to store result:', error)
  }
}