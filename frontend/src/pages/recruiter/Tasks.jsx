import useTranslation from "../../hooks/useTranslation";
import React, { useState, useEffect } from 'react';
import { FiPlus, FiMinus, FiCalendar, FiMessageSquare, FiPaperclip, FiSearch, FiX, FiBriefcase, FiList } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor, useDroppable, useDraggable } from '@dnd-kit/core';
import { recruiterAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PriorityBadge = ({ priority }) => {
  const {
    t
  } = useTranslation();

  const colors = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-orange-100 text-orange-700',
    Low: 'bg-emerald-100 text-emerald-700'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[priority]}`}>
      {priority}
    </span>
  );
};

const TaskCard = ({ task, isOverlay, jobs, onMoveTask }) => {
  const {
    t
  } = useTranslation();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id || task.id,
    data: task
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.5 : 1
  } : undefined;

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const associatedJob = jobs.find(j => j._id === task.jobId);

  const statusOrder = ['todo', 'in-progress', 'done'];
  const currentIndex = statusOrder.indexOf(task.status);
  
  const moveBack = () => {
    if (currentIndex > 0) onMoveTask(task._id || task.id, statusOrder[currentIndex - 1]);
  };
  
  const moveForward = () => {
    if (currentIndex < statusOrder.length - 1) onMoveTask(task._id || task.id, statusOrder[currentIndex + 1]);
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-4 rounded-xl border ${isOverlay ? 'border-indigo-500 shadow-xl scale-105' : 'border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1'} transition-all group flex flex-col gap-3 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center flex-wrap">
          <PriorityBadge priority={task.priority} />
          {task.aiSuggested && (
            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              <HiSparkles className="w-3 h-3" />{t("AI Pick")}</span>
          )}
        </div>
        <div className="flex items-center gap-1 transition-opacity">
          <button 
            onClick={moveBack}
            disabled={currentIndex === 0}
            className={`w-7 h-7 !min-w-[28px] !min-h-[28px] !max-w-[28px] !max-h-[28px] !p-0 !m-0 shrink-0 flex items-center justify-center rounded-full transition-colors ${currentIndex === 0 ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
            title="Move back"
          >
            <FiMinus className="w-4 h-4" />
          </button>
          <button 
            onClick={moveForward}
            disabled={currentIndex === statusOrder.length - 1}
            className={`w-7 h-7 !min-w-[28px] !min-h-[28px] !max-w-[28px] !max-h-[28px] !p-0 !m-0 shrink-0 flex items-center justify-center rounded-full transition-colors ${currentIndex === statusOrder.length - 1 ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
            title="Move forward"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>
      </div>
      <h4 className="text-sm font-bold text-gray-900 leading-snug">{task.title}</h4>
      {(task.candidateName || associatedJob) && (
        <div className="flex items-center gap-2 mt-1">
          {task.candidateName && (
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">
              {getInitials(task.candidateName)}
            </div>
          )}
          <div className="text-xs font-medium text-gray-700 truncate">
            {task.candidateName ? `${task.candidateName} ` : ''}
            {associatedJob && (
              <>
                <span className="text-gray-400 font-normal">{t("for")}</span> <span className="font-semibold text-gray-700">{associatedJob.title}</span>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100 text-gray-500">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <FiCalendar className="w-3.5 h-3.5" />
          <span className={task.dueDate === 'Today' ? 'text-orange-600 font-bold' : ''}>{task.dueDate}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          {task.comments > 0 && (
            <div className="flex items-center gap-1">
              <FiMessageSquare className="w-3.5 h-3.5" /> {task.comments}
            </div>
          )}
          {task.attachments > 0 && (
            <div className="flex items-center gap-1">
              <FiPaperclip className="w-3.5 h-3.5" /> {task.attachments}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Column = ({ title, count, colorClass, status, tasks, jobs, onMoveTask }) => {
  const {
    t
  } = useTranslation();

  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`${status === 'todo' ? 'bg-gray-50/50 border-gray-100' : status === 'in-progress' ? 'bg-indigo-50/30 border-indigo-100/50' : 'bg-emerald-50/30 border-emerald-100/50'} rounded-2xl border p-4 flex flex-col h-auto lg:h-full overflow-hidden transition-colors ${isOver ? 'ring-2 ring-indigo-400 bg-indigo-50/50' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
        </div>
      </div>
      <div className="flex-1 lg:overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-10">
        {tasks.map(task => (
          <TaskCard key={task._id || task.id} task={task} jobs={jobs} onMoveTask={onMoveTask} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium">
            {status === 'todo' ? 'No tasks to do' : status === 'in-progress' ? 'Drop tasks here' : 'Completed tasks'}
          </div>
        )}
      </div>
    </div>
  );
};

const Tasks = () => {
  const {
    t
  } = useTranslation();

  const [tasks, setTasks] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    candidateName: '',
    jobId: '',
    priority: 'Medium',
    dueDate: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, jobsRes] = await Promise.all([
        recruiterAPI.getTasks(),
        recruiterAPI.getJobs()
      ]);
      setTasks(tasksRes.data || []);
      setJobs(jobsRes.data || []);
    } catch (err) {
      toast.error('Failed to load tasks and jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id;
    await handleMoveTask(taskId, newStatus);
  };

  const handleMoveTask = async (taskId, newStatus) => {
    const task = tasks.find(t => (t._id || t.id) === taskId);

    if (task && task.status !== newStatus) {
      setTasks(tasks.map(t => (t._id || t.id) === taskId ? { ...t, status: newStatus } : t));
      
      try {
        await recruiterAPI.updateTask(taskId, { status: newStatus });
        toast.success(`Task moved to ${newStatus}`);
      } catch (err) {
        toast.error('Failed to move task');
        fetchData();
      }
    }
  };

  const openNewTaskModal = () => {
    setFormData({ 
      title: '', 
      candidateName: '', 
      jobId: selectedJob !== 'All' && selectedJob !== 'General' ? selectedJob : '', 
      priority: 'Medium', 
      dueDate: '' 
    });
    setIsModalOpen(true);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error('Title is required');

    try {
      const payload = { ...formData, status: 'todo' };
      if (!payload.jobId) {
        delete payload.jobId;
      }
      
      const res = await recruiterAPI.createTask(payload);
      setTasks([...tasks, res.data]);
      setIsModalOpen(false);
      toast.success('Task created successfully!');
    } catch (err) {
      toast.error('Failed to create task');
    }
  };

  // Filter logic
  let filteredTasks = tasks.filter(t => {
    if (selectedJob === 'All') return true;
    if (selectedJob === 'General') return !t.jobId;
    return t.jobId === selectedJob;
  });

  if (searchQuery) {
    filteredTasks = filteredTasks.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.candidateName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t("Reminders")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("Manage your hiring workflow by job role.")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Search tasks...")} 
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition w-full md:w-64"
            />
          </div>
          <button 
            onClick={openNewTaskModal}
            className="bg-[#1E293B] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800 transition flex items-center gap-2 whitespace-nowrap"
          >
            <FiPlus className="w-4 h-4" />{t("Set Reminder")}</button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-h-[calc(100vh-140px)] h-auto lg:h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
          
          {/* LEFT SIDEBAR: Job Selector */}
          <div className="w-full md:w-64 shrink-0 bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden h-fit md:h-full">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FiBriefcase className="text-indigo-500" />{t("Filter by Job")}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button 
                onClick={() => setSelectedJob('All')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-between ${selectedJob === 'All' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-2"><FiList className="w-4 h-4" />{t("All Reminders")}</div>
                <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">{tasks.length}</span>
              </button>
              
              <button 
                onClick={() => setSelectedJob('General')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-between ${selectedJob === 'General' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gray-200"></div>{t("General")}</div>
                <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">
                  {tasks.filter(t => !t.jobId).length}
                </span>
              </button>

              <div className="my-2 border-t border-gray-100"></div>
              
              {jobs.map(job => {
                const count = tasks.filter(t => t.jobId === job._id).length;
                return (
                  <button 
                    key={job._id}
                    onClick={() => setSelectedJob(job._id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-between ${selectedJob === job._id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <div className="truncate pr-2">{job.title}</div>
                    <span className={`${selectedJob === job._id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'} text-[10px] px-2 py-0.5 rounded-full shrink-0`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN KANBAN BOARD */}
          <div className="flex-1 h-full min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                {selectedJob === 'All' ? 'All Reminders' : selectedJob === 'General' ? 'General Tasks' : `${jobs.find(j => j._id === selectedJob)?.title || 'Job'} Pipeline`}
              </h2>
              <span className="text-sm font-medium text-gray-500">{filteredTasks.length}{t("total tasks")}</span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100%-40px)]">
                <Column title="To Do" count={todoTasks.length} colorClass="bg-gray-400" status="todo" tasks={todoTasks} jobs={jobs} onMoveTask={handleMoveTask} />
                <Column title="In Progress" count={inProgressTasks.length} colorClass="bg-indigo-500" status="in-progress" tasks={inProgressTasks} jobs={jobs} onMoveTask={handleMoveTask} />
                <Column title="Done" count={doneTasks.length} colorClass="bg-emerald-500" status="done" tasks={doneTasks} jobs={jobs} onMoveTask={handleMoveTask} />
              </div>
            </DndContext>
          </div>

        </div>
      )}
      {/* NEW TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{t("Create New Task")}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t("Task Title *")}</label>
                <input 
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                  placeholder={t("e.g. Schedule follow-up call")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("Candidate Name")}</label>
                  <input 
                    type="text" 
                    value={formData.candidateName} onChange={e => setFormData({...formData, candidateName: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    placeholder={t("John Doe")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("Job")}</label>
                  <select 
                    value={formData.jobId} onChange={e => setFormData({...formData, jobId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white"
                  >
                    <option value="">{t("General (No Job)")}</option>
                    {jobs.map(j => (
                      <option key={j._id} value={j._id}>{j.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("Priority")}</label>
                  <select 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white"
                  >
                    <option value="Low">{t("Low")}</option>
                    <option value="Medium">{t("Medium")}</option>
                    <option value="High">{t("High")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t("Due Date")}</label>
                  <input 
                    type="text" 
                    value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    placeholder={t("e.g. Tomorrow or Nov 12")}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">{t("Cancel")}</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">{t("Create Task")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
