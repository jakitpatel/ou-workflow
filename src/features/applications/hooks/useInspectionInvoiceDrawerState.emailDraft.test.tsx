import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createApplicationMessage } from '@/features/applications/api'
import { useInspectionInvoiceDrawerState } from '@/features/applications/hooks/useInspectionInvoiceDrawerState'
vi.mock('@/context/UserContext', () => ({ useUser: () => ({ token: 'HUNT-0905-C-token', email: 'hunt@example.invalid' }) }))
vi.mock('@/features/applications/api', () => ({ createApplicationMessage: vi.fn(), fetchApplicationDetail: vi.fn(async () => ({ companyContacts: [], companyAddresses: [] })), generateInspectionInvoice: vi.fn(), uploadApplicationFile: vi.fn() }))
vi.mock('@/features/tasks/hooks/useTaskQueries', () => ({ useUserListByRole: () => ({ data: [], isError: false, isLoading: false }) }))
it('preserves edited email fields through close/reopen and failed send, guards discard and resets between tasks', async () => {
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}})
 const wrapper=({children}:{children:React.ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>
 const {result,unmount,rerender}=renderHook(({id})=>useInspectionInvoiceDrawerState({applicationId:id,taskInstanceId:id,taskName:'Invoice'}),{wrapper,initialProps:{id:999999}})
 act(()=>result.current.openEmailPreview({messageText:'Template body',toUser:'original@example.invalid'}))
 expect(result.current.hasUnsavedChanges()).toBe(false)
 act(()=>result.current.openEmailPreview({messageText:'Updated template',toUser:'current@example.invalid'}))
 expect(result.current.emailBody).toBe('Updated template')
 expect(result.current.emailTo).toBe('current@example.invalid')
 expect(result.current.hasUnsavedChanges()).toBe(false)
 act(()=>{result.current.setEmailCc('cc@example.invalid');result.current.setEmailBcc('bcc@example.invalid');result.current.setEmailBody('HUNT-0905-C carefully edited email');result.current.setEmailTo('edited@example.invalid')})
 expect(result.current.emailBody).toContain('carefully edited')
 expect(result.current.hasUnsavedChanges()).toBe(true)
 act(()=>result.current.setShowEmailPreview(false))
 act(()=>result.current.openEmailPreview({messageText:'Template body',toUser:'original@example.invalid'}))
 expect(result.current.emailBody).toBe('HUNT-0905-C carefully edited email')
 expect(result.current.emailTo).toBe('edited@example.invalid')
 expect(result.current.emailCc).toBe('cc@example.invalid')
 expect(result.current.emailBcc).toBe('bcc@example.invalid')
 vi.mocked(createApplicationMessage).mockRejectedValueOnce(new Error('Send failed'))
 await act(async()=>{await expect(result.current.sendEmail({messageText:result.current.emailBody,toUser:result.current.emailTo,subject:'HUNT-C draft'})).rejects.toThrow('Send failed')})
 expect(result.current.showEmailPreview).toBe(true)
 expect(result.current.emailBody).toContain('carefully edited')
 expect(result.current.hasUnsavedChanges()).toBe(true)
 rerender({id:999998})
 act(()=>result.current.openEmailPreview({messageText:'Other task',toUser:'other@example.invalid'}))
 expect(result.current.emailBody).toBe('Other task')
 expect(result.current.emailTo).toBe('other@example.invalid')
 expect(result.current.hasUnsavedChanges()).toBe(false)
 unmount();client.clear()
})
